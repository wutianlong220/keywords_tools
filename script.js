class KeywordProcessor {
    constructor() {
        this.apiEndpoint = '';
        this.apiKey = '';
        this.isProcessing = false;
        this.shouldStop = false;
        this.init();
    }

    async init() {
        try {
            // 从配置文件加载API配置
            const response = await fetch('config.json');
            const config = await response.json();
            this.apiEndpoint = config.apiEndpoint;
            this.apiKey = config.apiKey;
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showError('无法加载API配置，请检查config.json文件');
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const stopBtn = document.getElementById('stopBtn');

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processFile(e.target.files[0]);
            }
        });

        // 拖拽上传
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
                this.processFile(e.dataTransfer.files[0]);
            }
        });

        // 停止按钮
        stopBtn.addEventListener('click', () => {
            this.stopProcessing();
        });
    }

    async processFile(file) {
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            this.showError('请选择XLSX文件');
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

        console.log(`批量翻译 ${keywords.length} 个关键词`);

        try {
            // 过滤掉已经是中文的关键词
            const keywordsToTranslate = [];
            const translationMap = new Map();
            
            keywords.forEach((keyword, index) => {
                if (!keyword || !keyword.trim()) {
                    translationMap.set(index, '');
                } else if (/[\u4e00-\u9fa5]/.test(keyword)) {
                    translationMap.set(index, keyword);
                } else {
                    keywordsToTranslate.push({ keyword, index });
                }
            });

            if (keywordsToTranslate.length === 0) {
                console.log('所有关键词都是中文，无需翻译');
                return keywords.map((keyword, index) => translationMap.get(index) || keyword);
            }

            console.log(`需要翻译 ${keywordsToTranslate.length} 个关键词`);

            // 分批处理，每批20个关键词
            const batchSize = 20;
            const totalBatches = Math.ceil(keywordsToTranslate.length / batchSize);
            const results = new Map();

            for (let i = 0; i < keywordsToTranslate.length; i += batchSize) {
                // 检查是否要停止
                if (this.shouldStop) {
                    throw new Error('USER_STOPPED');
                }
                
                const batchNum = Math.floor(i / batchSize) + 1;
                const batch = keywordsToTranslate.slice(i, i + batchSize);
                const progress = 15 + (batchNum / totalBatches) * 30; // 15-45%的进度用于翻译
                
                this.updateProgress(progress, `翻译进度: ${batchNum}/${totalBatches} 批 (${keywordsToTranslate.length} 个关键词)...`);
                console.log(`处理第 ${batchNum}/${totalBatches} 批，包含 ${batch.length} 个关键词`);
                
                const batchTranslations = await this.translateBatch(batch);
                batch.forEach((item, index) => {
                    results.set(item.index, batchTranslations[index]);
                });
            }

            // 构建最终结果
            const finalTranslations = [];
            for (let i = 0; i < keywords.length; i++) {
                if (translationMap.has(i)) {
                    finalTranslations.push(translationMap.get(i));
                } else {
                    finalTranslations.push(results.get(i) || keywords[i]);
                }
            }

            console.log('批量翻译完成');
            return finalTranslations;

        } catch (error) {
            console.error('批量翻译失败:', error);
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
            const response = await fetch(this.apiEndpoint, {
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
                            content: `请将以下英文关键词翻译成中文，每行一个，按照相同格式返回。如果已经是中文请直接返回原词：\n\n${prompt}`
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
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

    showProgress() {
        document.getElementById('progress').style.display = 'block';
        document.getElementById('result').style.display = 'none';
        document.getElementById('error').style.display = 'none';
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
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new KeywordProcessor();
});