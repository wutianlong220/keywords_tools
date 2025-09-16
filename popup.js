class KeywordProcessor {
    constructor() {
        this.apiEndpoint = '';
        this.apiKey = '';
        this.isProcessing = false;
        this.shouldStop = false;
        this.selectedFiles = [];
        this.processedFiles = [];
        this.failedFiles = [];
        this.batchMode = false;

        // 并发处理核心常量
        this.BATCH_SIZE = 80;           // 每批关键词数量
        this.CONCURRENCY_LIMIT = 5;     // 并发数量
        this.REQUEST_TIMEOUT = 30000;   // 请求超时时间
        this.MAX_RETRIES = 2;           // 最大重试次数

        this.init();
    }

    async init() {
        console.log('扩展初始化开始...');
        
        // 加载保存的API配置
        this.loadApiConfig();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 延迟更新配置状态显示，等待storage加载
        setTimeout(() => {
            this.updateConfigStatus();
            console.log('API配置状态:', this.apiEndpoint ? '已配置' : '未配置');
            console.log('API端点:', this.apiEndpoint);
            console.log('API密钥长度:', this.apiKey ? this.apiKey.length : 0);
        }, 1000);
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const stopBtn = document.getElementById('stopBtn');
        const selectFileBtn = document.getElementById('selectFileBtn');
        const batchProcessBtn = document.getElementById('batchProcessBtn');

        // 多文件选择事件
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files);
            }
        });

        // 选择文件按钮点击事件
        selectFileBtn.addEventListener('click', () => {
            console.log('选择文件按钮被点击了');
            fileInput.click();
        });

        // 拖拽上传（支持多文件）
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelection(e.dataTransfer.files);
            }
        });

        // 批量处理按钮
        batchProcessBtn.addEventListener('click', () => {
            this.startBatchProcessing();
        });

        // 停止按钮
        stopBtn.addEventListener('click', () => {
            this.stopProcessing();
        });

        // API配置相关事件
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        const clearConfigBtn = document.getElementById('clearConfigBtn');

        saveConfigBtn.addEventListener('click', () => {
            this.saveApiConfig();
        });

        clearConfigBtn.addEventListener('click', () => {
            this.clearApiConfig();
        });

        // 事件委托：处理动态创建的下载按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="download-zip"]')) {
                this.downloadAllFilesAsZip();
            }
        });
    }

    async processFile(file) {
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            this.showError('请选择XLSX文件');
            return;
        }

        // 检查API配置
        if (!this.apiEndpoint || !this.apiKey) {
            this.showError('请先配置API密钥');
            return;
        }

        // 重置停止状态
        this.shouldStop = false;
        this.isProcessing = true;

        this.showProgress();
        this.updateProgress(0, '读取文件...');

        try {
            const xlsxData = await this.readXLSX(file);
            
            // 检查是否要停止
            if (this.shouldStop) {
                this.hideProgress();
                this.showError('处理已停止');
                return;
            }
            
            this.updateProgress(10, '处理数据...');
            
            const processedData = await this.processXLSXData(xlsxData);
            
            // 检查是否要停止
            if (this.shouldStop) {
                this.hideProgress();
                this.showError('处理已停止');
                return;
            }
            
            this.updateProgress(90, '生成文件...');
            
            const processedXLSX = this.generateXLSX(processedData);
            this.enableDownload(processedXLSX, file.name);
            
            this.updateProgress(100, '处理完成！');
            setTimeout(() => this.hideProgress(), 1000);
            this.showResult();
            
        } catch (error) {
            console.error('处理文件时出错:', error);
            if (this.shouldStop) {
                this.showError('处理已停止');
            } else {
                this.showError('处理文件时出错: ' + error.message);
            }
            this.hideProgress();
        } finally {
            this.isProcessing = false;
        }
    }

    async readXLSX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 获取第一个sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // 转换为JSON数组
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async processXLSXData(xlsxData) {
        const headers = xlsxData[0];
        const rows = xlsxData.slice(1);

        // 查找列索引
        const keywordIndex = headers.findIndex(h => h.toLowerCase().includes('keyword'));
        const intentIndex = headers.findIndex(h => h.toLowerCase().includes('intent'));
        const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('volume'));
        const difficultyIndex = headers.findIndex(h => h.toLowerCase().includes('difficulty'));
        const cpcIndex = headers.findIndex(h => h.toLowerCase().includes('cpc'));

        if (keywordIndex === -1) {
            throw new Error('未找到Keyword列');
        }

        // 构建新的表头
        const newHeaders = [...headers];
        newHeaders.splice(keywordIndex + 1, 0, 'Translation');
        
        // 计算CPC列的位置（考虑插入Translation列后的位置变化）
        const cpcPosition = cpcIndex !== -1 ? cpcIndex + (cpcIndex > keywordIndex ? 1 : 0) : headers.length;
        newHeaders.splice(cpcPosition + 1, 0, 'Kdroi');
        newHeaders.splice(cpcPosition + 2, 0, 'SERP');
        newHeaders.splice(cpcPosition + 3, 0, 'Google Trends');
        newHeaders.splice(cpcPosition + 4, 0, 'Ahrefs Keyword Difficulty Checker');

        // 批量翻译关键词
        this.updateProgress(10, `准备翻译 ${rows.length} 个关键词...`);
        
        // 检查是否要停止
        if (this.shouldStop) {
            throw new Error('USER_STOPPED');
        }
        
        const keywords = rows.map(row => row[keywordIndex]);
        const translations = await this.batchTranslateKeywords(keywords, rows.length);

        const processedRows = [];
        
        // 处理每一行数据
        for (let i = 0; i < rows.length; i++) {
            // 检查是否要停止
            if (this.shouldStop) {
                throw new Error('USER_STOPPED');
            }
            
            const row = rows[i];
            this.updateProgress(50 + (i / rows.length) * 45, `处理数据行 ${i + 1}/${rows.length}...`);
            
            const newRow = [...row];
            const keyword = row[keywordIndex];
            
            // 插入翻译
            const translation = translations[i];
            newRow.splice(keywordIndex + 1, 0, translation);
            
            // 计算Kdroi
            const volume = parseFloat(row[volumeIndex]) || 0;
            const difficulty = parseFloat(row[difficultyIndex]) || 1;
            const cpc = parseFloat(row[cpcIndex]) || 0;
            const kdroi = difficulty > 0 ? parseFloat(((volume * cpc) / difficulty).toFixed(2)) : 0.00;
            
            // 计算CPC列在新行中的位置（考虑插入的Translation列）
            const adjustedCpcIndex = cpcIndex !== -1 ? cpcIndex + (cpcIndex > keywordIndex ? 1 : 0) : newRow.length - 4;
            newRow.splice(adjustedCpcIndex + 1, 0, kdroi);
            
            // 生成链接
            const serpLink = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
            const trendsLink = `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`;
            const ahrefsLink = `https://ahrefs.com/keyword-difficulty/?country=us&input=${encodeURIComponent(keyword)}`;
            
            newRow.splice(adjustedCpcIndex + 2, 0, serpLink);
            newRow.splice(adjustedCpcIndex + 3, 0, trendsLink);
            newRow.splice(adjustedCpcIndex + 4, 0, ahrefsLink);
            
            processedRows.push(newRow);
        }
        
        this.updateProgress(95, '生成最终文件...');

        return [newHeaders, ...processedRows];
    }

    async batchTranslateKeywords(keywords, totalRows) {
        if (!keywords || keywords.length === 0) {
            return [];
        }

        console.log(`并发批量翻译 ${keywords.length} 个关键词`);

        try {
            // 过滤需要翻译的关键词
            const keywordsToTranslate = [];
            const translationMap = new Map();

            keywords.forEach((keyword, index) => {
                if (!keyword || !keyword.trim()) {
                    translationMap.set(index, '');
                } else {
                    keywordsToTranslate.push({ keyword, index });
                }
            });

            if (keywordsToTranslate.length === 0) {
                console.log('所有关键词都是空，无需翻译');
                return keywords.map((keyword, index) => translationMap.get(index) || keyword);
            }

            console.log(`需要翻译 ${keywordsToTranslate.length} 个关键词，使用并发处理`);

            // 计算总批次数
            const totalBatches = Math.ceil(keywordsToTranslate.length / this.BATCH_SIZE);
            console.log(`总共分为 ${totalBatches} 批，每批 ${this.BATCH_SIZE} 个关键词，并发数 ${this.CONCURRENCY_LIMIT}`);

            // 初始化结果数组
            const finalTranslations = new Array(keywords.length);

            // 先填充空关键词和映射的结果
            for (let i = 0; i < keywords.length; i++) {
                if (translationMap.has(i)) {
                    finalTranslations[i] = translationMap.get(i);
                }
            }

            // 并发处理所有批次
            for (let batchGroup = 0; batchGroup < totalBatches; batchGroup += this.CONCURRENCY_LIMIT) {
                // 检查是否要停止
                if (this.shouldStop) {
                    throw new Error('USER_STOPPED');
                }

                const currentBatchPromises = [];
                const currentBatchCount = Math.min(this.CONCURRENCY_LIMIT, totalBatches - batchGroup);

                console.log(`开始处理批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount}`);

                // 创建当前批次的并发请求
                for (let j = 0; j < currentBatchCount; j++) {
                    const batchIndex = batchGroup + j;
                    const startIndex = batchIndex * this.BATCH_SIZE;
                    const endIndex = Math.min(startIndex + this.BATCH_SIZE, keywordsToTranslate.length);
                    const batchKeywords = keywordsToTranslate.slice(startIndex, endIndex);

                    // 更新进度显示
                    const progress = 15 + (batchGroup / totalBatches) * 30;
                    this.updateProgress(progress,
                        `并发翻译: 批次组 ${Math.floor(batchGroup / this.CONCURRENCY_LIMIT) + 1}/${Math.ceil(totalBatches / this.CONCURRENCY_LIMIT)}，` +
                        `当前处理 ${startIndex + 1}-${endIndex}/${keywordsToTranslate.length} 个关键词...`
                    );

                    // 创建带索引的翻译请求
                    currentBatchPromises.push(this.translateBatchWithIndex(batchKeywords, startIndex));
                }

                try {
                    // 等待当前批次组的所有并发请求完成
                    const batchResults = await Promise.all(currentBatchPromises);

                    // 按索引组装结果
                    batchResults.forEach(result => {
                        for (let k = 0; k < result.translations.length; k++) {
                            const originalIndex = result.startIndex + k;
                            const originalKeywordIndex = keywordsToTranslate[originalIndex]?.index;
                            if (originalKeywordIndex !== undefined) {
                                finalTranslations[originalKeywordIndex] = result.translations[k];
                            }
                        }
                    });

                    console.log(`批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount} 完成`);

                } catch (error) {
                    console.error(`批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount} 处理失败:`, error);
                    throw error;
                }
            }

            // 填充未翻译的关键词（保持原词）
            for (let i = 0; i < finalTranslations.length; i++) {
                if (finalTranslations[i] === undefined) {
                    finalTranslations[i] = keywords[i];
                }
            }

            console.log('并发批量翻译完成');
            return finalTranslations;

        } catch (error) {
            console.error('并发批量翻译失败:', error);
            if (error.message === 'USER_STOPPED') {
                throw error;
            }
            return keywords; // 翻译失败时返回原词
        }
    }

    async translateBatch(batch) {
        const prompt = batch.map((item, index) =>
            `${index + 1}. ${item.keyword}`
        ).join('\n');

        try {
            const response = await fetch(`${this.apiEndpoint}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: `请将以下关键词翻译成中文，每行一个，按照相同格式返回。不管原词是什么语言，都必须翻译成中文：\n\n${prompt}`
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误详情:', errorText);
                throw new Error(`API请求失败: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            const translationText = data.choices[0].message.content.trim();

            // 解析翻译结果
            const lines = translationText.split('\n').filter(line => line.trim());
            const translations = [];

            for (let i = 0; i < batch.length; i++) {
                const line = lines[i] || '';
                // 提取翻译结果，去掉序号和可能的标点
                const translation = line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim();
                translations.push(translation || batch[i].keyword);
            }

            return translations;

        } catch (error) {
            console.error('批量翻译失败:', error);
            return batch.map(item => item.keyword);
        }
    }

    async translateBatchWithIndex(batch, startIndex) {
        const prompt = batch.map((item, index) =>
            `${index + 1}. ${item.keyword}`
        ).join('\n');

        console.log(`开始翻译批次 ${startIndex + 1}-${startIndex + batch.length}，共 ${batch.length} 个关键词`);

        let lastError = null;

        // 重试机制
        for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
            try {
                // 添加超时控制
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

                const response = await fetch(`${this.apiEndpoint}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            {
                                role: 'user',
                                content: `请将以下关键词翻译成中文，每行一个，按照相同格式返回。不管原词是什么语言，都必须翻译成中文：\n\n${prompt}`
                            }
                        ],
                        max_tokens: Math.min(batch.length * 20, 4000), // 动态调整token数量
                        temperature: 0.1
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`批次 ${startIndex} 第${attempt}次尝试 API错误详情:`, errorText);
                    throw new Error(`API请求失败: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();
                const translationText = data.choices[0].message.content.trim();

                console.log(`批次 ${startIndex} 第${attempt}次尝试翻译响应长度: ${translationText.length}`);

                // 解析翻译结果
                const lines = translationText.split('\n').filter(line => line.trim());
                const translations = [];

                for (let i = 0; i < batch.length; i++) {
                    const line = lines[i] || '';
                    // 提取翻译结果，去掉序号和可能的标点
                    const translation = line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim();
                    translations.push(translation || batch[i].keyword);
                }

                console.log(`批次 ${startIndex} 第${attempt}次尝试翻译完成，成功翻译 ${translations.length} 个关键词`);

                // 返回带索引的结果
                return {
                    startIndex: startIndex,
                    translations: translations
                };

            } catch (error) {
                lastError = error;
                console.error(`批次 ${startIndex} 第${attempt}次尝试失败:`, error);

                // 如果不是最后一次尝试，等待一段时间后重试
                if (attempt <= this.MAX_RETRIES) {
                    const delayTime = attempt * 1000; // 递增延迟：1秒，2秒
                    console.log(`批次 ${startIndex} 第${attempt}次尝试失败，${delayTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delayTime));
                }
            }
        }

        // 所有重试都失败，返回原始关键词
        console.error(`批次 ${startIndex} 所有重试都失败，返回原始关键词`);
        return {
            startIndex: startIndex,
            translations: batch.map(item => item.keyword)
        };
    }

    generateXLSX(data) {
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        
        // 将数据转换为工作表
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        
        // 设置Kdroi列为数字格式
        const headers = data[0];
        const kdroiColIndex = headers.findIndex(h => h === 'Kdroi');
        
        if (kdroiColIndex !== -1) {
            // 遍历所有行（跳过标题行）
            for (let i = 1; i < data.length; i++) {
                const cellAddress = XLSX.utils.encode_cell({r: i, c: kdroiColIndex});
                if (worksheet[cellAddress]) {
                    // 设置单元格为数字类型
                    worksheet[cellAddress].t = 'n';
                    worksheet[cellAddress].z = '0.00'; // 设置为两位小数格式
                }
            }
        }
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, "Processed Keywords");
        
        return workbook;
    }

    enableDownload(workbook, originalFilename) {
        const downloadBtn = document.getElementById('downloadBtn');
        
        downloadBtn.onclick = async (e) => {
            e.preventDefault();
            
            try {
                // 显示保存对话框
                const newFilename = originalFilename.replace(/\.xlsx$/i, '') + '_processed.xlsx';
                const suggestedName = newFilename;
                
                // 使用 File System Access API（如果支持）
                if ('showSaveFilePicker' in window) {
                    try {
                        const fileHandle = await window.showSaveFilePicker({
                            suggestedName: suggestedName,
                            types: [
                                {
                                    description: 'Excel files',
                                    accept: {
                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                    },
                                },
                            ],
                        });
                        
                        // 将工作簿转换为二进制数据
                        const xlsxData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
                        const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        
                        this.updateProgress(100, '文件保存成功！');
                        return;
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('保存失败:', err);
                        }
                        return;
                    }
                }
                
                // 备用方案：使用传统下载方式
                this.showSaveDialog(workbook, newFilename);
                
            } catch (error) {
                console.error('保存文件时出错:', error);
                this.showError('保存文件时出错: ' + error.message);
            }
        };
    }

    showSaveDialog(workbook, defaultFilename) {
        // 创建一个模态对话框让用户输入文件名
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 400px;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 20px;">保存文件</h3>
            <label for="filenameInput" style="display: block; margin-bottom: 10px;">文件名：</label>
            <input type="text" id="filenameInput" value="${defaultFilename}" style="width: 100%; padding: 8px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px;">
            <div style="text-align: right;">
                <button id="cancelBtn" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ccc; background-color: #f8f9fa; border-radius: 4px; cursor: pointer;">取消</button>
                <button id="saveBtn" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        const filenameInput = document.getElementById('filenameInput');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveBtn = document.getElementById('saveBtn');
        
        // 自动选中文件名（不含扩展名）
        const nameWithoutExt = defaultFilename.slice(0, defaultFilename.lastIndexOf('.'));
        filenameInput.value = nameWithoutExt;
        filenameInput.focus();
        filenameInput.select();
        
        // 处理保存
        const handleSave = () => {
            let filename = filenameInput.value.trim();
            if (!filename) {
                filename = nameWithoutExt;
            }
            
            // 确保有.csv扩展名
            if (!filename.toLowerCase().endsWith('.xlsx')) {
                filename += '.xlsx';
            }
            
            // 将工作簿转换为二进制数据
            const xlsxData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
            const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            
            const hiddenLink = document.createElement('a');
            hiddenLink.href = url;
            hiddenLink.download = filename;
            hiddenLink.style.display = 'none';
            
            document.body.appendChild(hiddenLink);
            hiddenLink.click();
            document.body.removeChild(hiddenLink);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            document.body.removeChild(modal);
        };
        
        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Enter键保存
        filenameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showProgress(message = '处理中...') {
        document.getElementById('progress').style.display = 'block';
        document.getElementById('result').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('progressText').textContent = message;
    }

    hideProgress() {
        document.getElementById('progress').style.display = 'none';
        
        // 重置停止按钮状态
        const stopBtn = document.getElementById('stopBtn');
        stopBtn.disabled = false;
        stopBtn.textContent = '停止处理';
    }

    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }

    showResult() {
        document.getElementById('result').style.display = 'block';
    }

    hideResult() {
        document.getElementById('result').style.display = 'none';
    }

    stopProcessing() {
        if (this.isProcessing) {
            this.shouldStop = true;
            this.updateProgress(0, '正在停止处理...');
            
            // 禁用停止按钮，防止重复点击
            const stopBtn = document.getElementById('stopBtn');
            stopBtn.disabled = true;
            stopBtn.textContent = '正在停止...';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // API配置管理方法
    loadApiConfig() {
        try {
            // 使用chrome.storage.local替代localStorage
            chrome.storage.local.get(['deepseek_api_endpoint', 'deepseek_api_key'], (result) => {
                const endpoint = result.deepseek_api_endpoint;
                const apiKey = result.deepseek_api_key;
                
                if (endpoint && apiKey) {
                    this.apiEndpoint = endpoint;
                    this.apiKey = apiKey;
                    
                    // 填充到表单
                    document.getElementById('apiEndpoint').value = endpoint;
                    document.getElementById('apiKey').value = apiKey;
                }
                
                // 更新状态显示
                this.updateConfigStatus();
            });
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    }

    saveApiConfig() {
        const endpoint = document.getElementById('apiEndpoint').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();
        
        // 验证配置
        const validationError = this.validateApiConfig(endpoint, apiKey);
        if (validationError) {
            this.showError(validationError);
            return;
        }
        
        try {
            // 保存到chrome.storage.local
            chrome.storage.local.set({
                'deepseek_api_endpoint': endpoint,
                'deepseek_api_key': apiKey
            }, () => {
                // 更新实例变量
                this.apiEndpoint = endpoint;
                this.apiKey = apiKey;
                
                // 更新状态显示
                this.updateConfigStatus();
                
                this.showSuccess('API配置保存成功！');
            });
        } catch (error) {
            this.showError('保存配置失败: ' + error.message);
        }
    }

    clearApiConfig() {
        try {
            // 清除chrome.storage.local
            chrome.storage.local.remove(['deepseek_api_endpoint', 'deepseek_api_key'], () => {
                // 清除表单
                document.getElementById('apiEndpoint').value = '';
                document.getElementById('apiKey').value = '';
                
                // 清除实例变量
                this.apiEndpoint = '';
                this.apiKey = '';
                
                // 更新状态显示
                this.updateConfigStatus();
                
                this.showSuccess('API配置已清除');
            });
        } catch (error) {
            this.showError('清除配置失败: ' + error.message);
        }
    }

    validateApiConfig(endpoint, apiKey) {
        if (!endpoint) {
            return '请输入API地址';
        }
        
        if (!apiKey) {
            return '请输入API密钥';
        }
        
        return null; // 验证通过
    }

    updateConfigStatus() {
        const statusElement = document.getElementById('configStatus');
        const isConfigured = this.apiEndpoint && this.apiKey;
        
        if (isConfigured) {
            statusElement.textContent = '已配置';
            statusElement.className = 'config-status status-configured';
        } else {
            statusElement.textContent = '未配置';
            statusElement.className = 'config-status status-not-configured';
        }
    }

    showSuccess(message) {
        // 临时显示成功消息
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            padding: 12px 20px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // ==================== 多文件选择和批量处理相关方法 ====================

    handleFileSelection(files) {
        // 过滤只保留.xlsx文件
        this.selectedFiles = Array.from(files).filter(file =>
            file.name.toLowerCase().endsWith('.xlsx')
        );

        console.log(`选择了 ${this.selectedFiles.length} 个XLSX文件`);

        if (this.selectedFiles.length === 0) {
            this.showError('请选择XLSX文件');
            return;
        }

        this.updateFileList();
        this.updateBatchProcessButton();
        this.showBatchControls();
    }

    updateFileList() {
        const container = document.getElementById('selectedFiles');
        if (!container) return;

        container.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="file-status status-pending" id="file-${index}-status">等待处理</div>
            `;
            container.appendChild(fileItem);
        });
    }

    updateBatchProcessButton() {
        const batchProcessBtn = document.getElementById('batchProcessBtn');
        if (!batchProcessBtn) return;

        const hasFiles = this.selectedFiles.length > 0;
        const isProcessing = this.isProcessing;

        batchProcessBtn.disabled = !hasFiles || isProcessing;

        if (hasFiles) {
            batchProcessBtn.textContent = `处理 ${this.selectedFiles.length} 个文件`;
        } else {
            batchProcessBtn.textContent = '开始批量处理';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showBatchControls() {
        const batchControls = document.getElementById('batchControls');
        const fileList = document.getElementById('fileList');

        if (batchControls) batchControls.style.display = 'block';
        if (fileList) fileList.style.display = 'block';
    }

    hideBatchControls() {
        const batchControls = document.getElementById('batchControls');
        const fileList = document.getElementById('fileList');

        if (batchControls) batchControls.style.display = 'none';
        if (fileList) fileList.style.display = 'none';
    }

    // ==================== 批量处理核心方法 ====================

    async startBatchProcessing() {
        if (this.selectedFiles.length === 0) {
            this.showError('请先选择要处理的文件');
            return;
        }

        // 检查API配置
        if (!this.apiEndpoint || !this.apiKey) {
            this.showError('请先配置API密钥和地址<br><br>1. 在"API配置设置"区域输入您的API信息<br>2. 点击"保存配置"<br>3. 然后再开始批量处理');
            // 高亮显示API配置区域
            const apiConfig = document.getElementById('apiConfig');
            if (apiConfig) {
                apiConfig.style.border = '2px solid #dc3545';
                apiConfig.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    apiConfig.style.border = '';
                }, 3000);
            }
            return;
        }

        this.batchMode = true;
        this.isProcessing = true;
        this.shouldStop = false;
        this.processedFiles = [];
        this.failedFiles = [];

        this.updateUIForBatchProcessing();
        this.showBatchProgress();

        try {
            // 依次处理每个文件
            for (let i = 0; i < this.selectedFiles.length; i++) {
                if (this.shouldStop) break;

                const file = this.selectedFiles[i];
                await this.processSingleFileInBatch(file, i);
            }

            // 批量处理完成
            await this.completeBatchProcessing();

        } catch (error) {
            console.error('批量处理错误:', error);
            this.showError('批量处理过程中发生错误: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.batchMode = false;
            this.updateUIForIdle();
        }
    }

    async processSingleFileInBatch(file, fileIndex) {
        this.updateFileStatus(fileIndex, 'processing', '处理中...');

        try {
            console.log(`开始处理文件: ${file.name} (索引: ${fileIndex})`);

            // 读取文件并获取原始关键词数量
            const xlsxData = await this.readXLSX(file);
            const originalKeywordCount = xlsxData.length - 1; // 减去表头

            // 提取词根
            const wordRoot = this.extractWordRoot(file.name);

            // 修改processFile方法支持批量模式
            const result = await this.processXLSXData(xlsxData);

            this.processedFiles.push({
                file: file,
                data: result,
                index: fileIndex,
                originalKeywordCount: originalKeywordCount,
                wordRoot: wordRoot
            });

            this.updateFileStatus(fileIndex, 'completed', '已完成');
            console.log(`文件处理成功: ${file.name}，关键词数量: ${originalKeywordCount}，词根: ${wordRoot}`);

        } catch (error) {
            console.error(`文件处理失败: ${file.name}`, error);
            this.failedFiles.push({
                file: file,
                error: error.message,
                index: fileIndex
            });

            this.updateFileStatus(fileIndex, 'failed', '处理失败');
        }

        this.updateBatchProgress();
    }

    extractWordRoot(fileName) {
        // 从文件名中提取词根
        // 示例: builder_broad-match_us_2025-09-15.xlsx -> builder
        const nameWithoutExt = fileName.replace('.xlsx', '').replace('.xls', '');
        const parts = nameWithoutExt.split('_');

        // 返回第一个部分作为词根
        return parts[0] || '未知';
    }

    async processFileInBatchMode(file, fileIndex) {
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            throw new Error('请选择XLSX文件');
        }

        try {
            const xlsxData = await this.readXLSX(file);

            // 检查是否要停止
            if (this.shouldStop) {
                throw new Error('USER_STOPPED');
            }

            const processedData = await this.processXLSXData(xlsxData);

            // 检查是否要停止
            if (this.shouldStop) {
                throw new Error('USER_STOPPED');
            }

            return processedData;

        } catch (error) {
            console.error('处理文件时出错:', error);
            if (this.shouldStop) {
                throw new Error('USER_STOPPED');
            } else {
                throw error;
            }
        }
    }

    updateFileStatus(fileIndex, status, text) {
        const statusElement = document.getElementById(`file-${fileIndex}-status`);
        if (statusElement) {
            statusElement.className = `file-status status-${status}`;
            statusElement.textContent = text;
        }
    }

    updateUIForBatchProcessing() {
        const batchProcessBtn = document.getElementById('batchProcessBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (batchProcessBtn) {
            batchProcessBtn.disabled = true;
            batchProcessBtn.textContent = '批量处理中...';
        }

        if (stopBtn) {
            stopBtn.disabled = false;
        }

        // 隐藏单文件处理相关的UI
        this.hideProgress();
        this.hideResult();
    }

    updateUIForIdle() {
        const batchProcessBtn = document.getElementById('batchProcessBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (batchProcessBtn) {
            batchProcessBtn.disabled = false;
            this.updateBatchProcessButton();
        }

        if (stopBtn) {
            stopBtn.disabled = true;
        }

        this.hideBatchProgress();
    }

    showBatchProgress() {
        const batchProgress = document.getElementById('batchProgress');
        if (batchProgress) {
            batchProgress.style.display = 'block';
        }
        this.updateBatchProgress();
    }

    hideBatchProgress() {
        const batchProgress = document.getElementById('batchProgress');
        if (batchProgress) {
            batchProgress.style.display = 'none';
        }
    }

    updateBatchProgress() {
        const completed = this.processedFiles.length + this.failedFiles.length;
        const total = this.selectedFiles.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        const progressFill = document.getElementById('batchProgressFill');
        const progressText = document.getElementById('batchProgressText');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${completed}/${total}`;
        }
    }

    async completeBatchProcessing() {
        const successCount = this.processedFiles.length;
        const failCount = this.failedFiles.length;

        // 显示处理结果（优先显示，让用户知道处理结果）
        this.showBatchResult(successCount, failCount);

        // 不再自动下载，等待用户点击下载按钮
    }

    addDownloadErrorToResult() {
        const existingResult = document.querySelector('.batch-result');
        if (existingResult) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-details';
            errorDiv.innerHTML = '⚠️ 批量下载失败，但所有文件已成功处理。您可以手动下载每个文件。';
            existingResult.appendChild(errorDiv);
        }
    }

    showBatchResult(successCount, failCount) {
        // 移除之前的结果
        const existingResult = document.querySelector('.batch-result');
        if (existingResult) {
            existingResult.remove();
        }

        const resultDiv = document.createElement('div');
        resultDiv.className = 'batch-result';

        let resultHTML = `
            <h3>批量处理完成</h3>
            <p>✅ 成功处理: ${successCount} 个文件</p>
            <p>❌ 处理失败: ${failCount} 个文件</p>
        `;

        if (failCount > 0) {
            resultHTML += `<div class="error-details">失败文件: ${this.failedFiles.map(f => f.file.name).join(', ')}</div>`;
        }

        if (successCount > 0) {
            resultHTML += `
                <div class="download-section" style="margin-top: 15px;">
                    <button class="download-btn" id="downloadAllBtn" data-action="download-zip">
                        📥 下载合并后的Excel文件 (包含所有数据)
                    </button>
                </div>
            `;
        }

        resultDiv.innerHTML = resultHTML;

        // 插入到错误信息前面
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.parentNode.insertBefore(resultDiv, errorDiv);
        } else {
            document.querySelector('.container')?.appendChild(resultDiv);
        }
    }

    // retryDownload方法已废弃，用户直接点击下载按钮即可

    showProcessedFilesList() {
        let message = '已成功处理的文件：\n\n';
        this.processedFiles.forEach((file, index) => {
            message += `${index + 1}. ${file.file.name}\n`;
        });

        if (this.failedFiles.length > 0) {
            message += '\n处理失败的文件：\n';
            this.failedFiles.forEach((file, index) => {
                message += `${index + 1}. ${file.file.name} - ${file.error}\n`;
            });
        }

        this.showSuccess(message);
    }

    // ==================== 批量下载功能 ====================

    async downloadAllFilesAsZip() {
        if (this.processedFiles.length === 0) {
            this.showError('没有可下载的文件');
            return;
        }

        try {
            this.showProgress('正在合并Excel文件...');

            // 创建合并的工作簿
            const mergedWorkbook = await this.createMergedWorkbook();

            // 下载合并后的文件
            const excelBuffer = await this.writeWorkbookToBuffer(mergedWorkbook);
            this.downloadExcelFile(excelBuffer, `关键词工具_批量处理结果_${new Date().toISOString().split('T')[0]}.xlsx`);

            this.hideProgress();
            this.showSuccess(`✅ 文件已下载！包含 ${this.processedFiles.length} 个文件的所有数据`);

        } catch (error) {
            console.error('合并文件失败:', error);
            this.hideProgress();
            this.showError('合并文件失败: ' + error.message);
        }
    }

    async createMergedWorkbook() {
        // 创建新的工作簿
        const mergedWorkbook = XLSX.utils.book_new();

        // 添加总览sheet（包含使用说明）
        const overviewData = [
            ['文件名', '词根', '原始关键词数量', '处理后行数', '处理状态', '处理时间'],
            ...this.processedFiles.map((file, index) => [
                file.file.name,
                file.wordRoot || '未知',
                file.originalKeywordCount || 0,
                file.data.length - 1, // 减去表头
                '处理成功',
                new Date().toLocaleString('zh-CN')
            ])
        ];

        // 添加使用说明在右侧（从I列开始）
        const instructionsStartCol = 8; // I列

        // 确保有足够的行来容纳使用说明（表头+文件数据+23行使用说明）
        const requiredRows = overviewData.length + 23;
        while (overviewData.length < requiredRows) {
            overviewData.push([]);
        }

        // 为所有行填充空值（到H列结束）
        for (let i = 0; i < overviewData.length; i++) {
            while (overviewData[i].length <= instructionsStartCol) {
                overviewData[i].push('');
            }
        }

        // 添加使用说明到I列
        overviewData[0][instructionsStartCol] = '关键词工具 - 批量处理结果';
        overviewData[1][instructionsStartCol] = '';
        overviewData[2][instructionsStartCol] = '使用说明：';
        overviewData[3][instructionsStartCol] = '1. 每个 sheet 对应一个原始文件的数据';
        overviewData[4][instructionsStartCol] = '2. "总览" sheet 显示所有文件的处理情况';
        overviewData[5][instructionsStartCol] = '3. 所有关键词都已翻译并计算了 Kdroi 值';
        overviewData[6][instructionsStartCol] = '4. 生成了各个平台的链接';
        overviewData[7][instructionsStartCol] = '';
        overviewData[8][instructionsStartCol] = '列说明：';
        overviewData[9][instructionsStartCol] = 'Keyword: 原始关键词';
        overviewData[10][instructionsStartCol] = 'Translation: 中文翻译';
        overviewData[11][instructionsStartCol] = 'Intent: 搜索意图';
        overviewData[12][instructionsStartCol] = 'Volume: 搜索量';
        overviewData[13][instructionsStartCol] = 'Keyword Difficulty: 关键词难度';
        overviewData[14][instructionsStartCol] = 'CPC (USD): 每次点击成本';
        overviewData[15][instructionsStartCol] = 'Kdroi: 投资回报率 (Volume × CPC ÷ Difficulty)';
        overviewData[16][instructionsStartCol] = 'SERP: Google搜索链接';
        overviewData[17][instructionsStartCol] = 'Google Trends: 趋势链接';
        overviewData[18][instructionsStartCol] = 'Ahrefs: Ahrefs查询链接';
        overviewData[19][instructionsStartCol] = '';
        overviewData[20][instructionsStartCol] = `生成时间：${new Date().toLocaleString('zh-CN')}`;
        overviewData[21][instructionsStartCol] = `文件数量：${this.processedFiles.length.toString()}`;
        overviewData[22][instructionsStartCol] = `总关键词数：${this.processedFiles.reduce((sum, file) => sum + (file.originalKeywordCount || 0), 0).toString()}`;

        const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);

        // 设置总览sheet的列宽
        overviewSheet['!cols'] = [
            { wch: 40 },  // 文件名
            { wch: 15 },  // 词根
            { wch: 12 },  // 原始关键词数量
            { wch: 12 },  // 处理后行数
            { wch: 12 },  // 处理状态
            { wch: 20 },  // 处理时间
            { wch: 5 },   // 空列分隔
            { wch: 40 }   // 使用说明
        ];

        XLSX.utils.book_append_sheet(mergedWorkbook, overviewSheet, '总览');

        // 为每个文件创建一个sheet
        for (let i = 0; i < this.processedFiles.length; i++) {
            const processedFile = this.processedFiles[i];

            // 生成sheet名称（使用文件名，去除特殊字符）
            const sheetName = this.generateValidSheetName(processedFile.file.name, i);

            // 创建sheet
            const worksheet = XLSX.utils.aoa_to_sheet(processedFile.data);

            // 设置列宽
            if (!worksheet['!cols']) {
                worksheet['!cols'] = [
                    { wch: 30 }, // Keyword
                    { wch: 30 }, // Translation
                    { wch: 15 }, // Intent
                    { wch: 12 }, // Volume
                    { wch: 15 }, // Keyword Difficulty
                    { wch: 12 }, // CPC (USD)
                    { wch: 12 }, // Kdroi
                    { wch: 50 }, // SERP
                    { wch: 50 }, // Google Trends
                    { wch: 50 }  // Ahrefs
                ];
            }

            // 添加到工作簿
            XLSX.utils.book_append_sheet(mergedWorkbook, worksheet, sheetName);
        }

        return mergedWorkbook;
    }

    generateValidSheetName(fileName, index) {
        // 去除文件扩展名
        let name = fileName.replace('.xlsx', '').replace('.xls', '');

        // 限制长度（Excel sheet名称最多31个字符）
        if (name.length > 25) {
            name = name.substring(0, 25);
        }

        // 移除特殊字符
        name = name.replace(/[\\/*?:[\]]/g, '');

        // 如果为空或过短，使用默认名称
        if (!name || name.length < 2) {
            name = `文件${index + 1}`;
        }

        return name;
    }

    async createBatchDownload() {
        // 已废弃的方法，直接调用新的合并下载方法
        await this.downloadAllFilesAsZip();
    }

    async loadJSZip() {
        // JSZip is now loaded locally, just check if it's available
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded');
        }
        return Promise.resolve();
    }

    createWorkbookFromData(data) {
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        return workbook;
    }

    downloadExcelFile(buffer, fileName) {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processed_${fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    
    async writeWorkbookToBuffer(workbook) {
        return new Promise((resolve, reject) => {
            try {
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                resolve(buffer);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ==================== 修改原有方法以支持批量处理 ====================

    async processFile(file, autoDownload = true) {
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            this.showError('请选择XLSX文件');
            return;
        }

        // 检查API配置
        if (!this.apiEndpoint || !this.apiKey) {
            this.showError('请先配置API密钥');
            return;
        }

        // 重置停止状态
        this.shouldStop = false;
        this.isProcessing = true;

        this.showProgress();
        this.updateProgress(0, '读取文件...');

        try {
            const xlsxData = await this.readXLSX(file);

            // 检查是否要停止
            if (this.shouldStop) {
                this.hideProgress();
                this.showError('处理已停止');
                return;
            }

            this.updateProgress(10, '处理数据...');

            const processedData = await this.processXLSXData(xlsxData);

            // 检查是否要停止
            if (this.shouldStop) {
                this.hideProgress();
                this.showError('处理已停止');
                return;
            }

            this.updateProgress(90, '生成文件...');

            const processedXLSX = this.generateXLSX(processedData);

            if (autoDownload) {
                this.enableDownload(processedXLSX, file.name);
                this.updateProgress(100, '处理完成！');
                setTimeout(() => this.hideProgress(), 1000);
                this.showResult();
            } else {
                // 批量模式，直接返回处理后的数据
                return processedData;
            }

        } catch (error) {
            console.error('处理文件时出错:', error);
            if (this.shouldStop) {
                this.showError('处理已停止');
            } else {
                this.showError('处理文件时出错: ' + error.message);
            }
            this.hideProgress();
        } finally {
            this.isProcessing = false;
        }
    }

    generateXLSX(data) {
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // 设置Kdroi列为数字格式
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];

                // 检查是否是Kdroi列
                if (row === range.s.r + 1) { // 第一行是表头
                    const headerRow = data[0];
                    if (headerRow[col] === 'Kdroi') {
                        // 为整个Kdroi列设置数字格式
                        for (let dataRow = range.s.r + 1; dataRow <= range.e.r; dataRow++) {
                            const dataCellAddress = XLSX.utils.encode_cell({ r: dataRow, c: col });
                            const dataCell = worksheet[dataCellAddress];
                            if (dataCell && !isNaN(dataCell.v)) {
                                dataCell.z = '#,##0.00'; // 设置数字格式，保留两位小数
                                dataCell.t = 'n'; // 确保类型为数字
                            }
                        }
                    }
                }
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        return workbook;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 设置弹窗尺寸
    document.body.style.width = '700px';
    document.body.style.height = '700px';

    // 初始化关键词处理器并暴露到全局
    window.keywordProcessor = new KeywordProcessor();
});