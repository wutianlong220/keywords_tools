class KeywordProcessor {
    constructor() {
        this.files = [];
        this.processedFiles = [];
        this.isProcessing = false;
        this.apiConfig = {
            endpoint: '',
            key: ''
        };

        this.init();
    }

    init() {
        this.loadApiConfig();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 文件上传相关
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // API配置相关
        document.getElementById('saveConfig').addEventListener('click', this.saveApiConfig.bind(this));

        // 操作按钮
        document.getElementById('processBtn').addEventListener('click', this.startProcessing.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadMergedFile.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearFiles.bind(this));
    }

    async loadApiConfig() {
        try {
            const result = await chrome.storage.local.get(['deepseek_api_endpoint', 'deepseek_api_key']);
            this.apiConfig.endpoint = result.deepseek_api_endpoint || '';
            this.apiConfig.key = result.deepseek_api_key || '';

            document.getElementById('apiEndpoint').value = this.apiConfig.endpoint;
            document.getElementById('apiKey').value = this.apiConfig.key;

            if (this.apiConfig.endpoint && this.apiConfig.key) {
                console.log('API配置已加载');
            }

            this.updateProcessButton();
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    }

    async saveApiConfig() {
        const endpoint = document.getElementById('apiEndpoint').value.trim();
        const key = document.getElementById('apiKey').value.trim();

        if (!endpoint || !key) {
            this.showNotification('请填写完整的API配置', 'error');
            return;
        }

        try {
            await chrome.storage.local.set({
                'deepseek_api_endpoint': endpoint,
                'deepseek_api_key': key
            });

            this.apiConfig.endpoint = endpoint;
            this.apiConfig.key = key;

            this.showNotification('API配置保存成功', 'success');
            this.updateProcessButton();
        } catch (error) {
            this.showNotification('API配置保存失败', 'error');
        }
    }

    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(newFiles) {
        const validFiles = newFiles.filter(file =>
            file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        );

        if (validFiles.length !== newFiles.length) {
            this.showNotification('只支持.xlsx和.xls文件', 'error');
        }

        validFiles.forEach(file => {
            const fileId = Date.now() + Math.random();
            this.files.push({
                id: fileId,
                file: file,
                status: 'pending',
                progress: 0,
                data: null,
                processedData: null
            });

            console.log(`文件已添加: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
        });

        this.updateFileList();
        this.updateProcessButton();
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        this.files.forEach(fileInfo => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div>
                    <div style="font-weight: bold;">${fileInfo.file.name}</div>
                    <div style="font-size: 12px; color: #666;">
                        ${(fileInfo.file.size / 1024).toFixed(0)} KB
                    </div>
                </div>
                <div class="status ${fileInfo.status}">
                    ${this.getStatusText(fileInfo.status)}
                </div>
            `;
            fileList.appendChild(fileItem);
        });
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '等待处理',
            'processing': '处理中',
            'completed': '已完成',
            'error': '错误'
        };
        return statusMap[status] || status;
    }

    updateProcessButton() {
        const processBtn = document.getElementById('processBtn');
        const hasFiles = this.files.length > 0;
        const hasApiConfig = this.apiConfig.endpoint && this.apiConfig.key;
        const canProcess = hasFiles && hasApiConfig && !this.isProcessing;

        processBtn.disabled = !canProcess;
        processBtn.textContent = this.isProcessing ? '处理中...' : '开始处理';
    }

    async startProcessing() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.processedFiles = [];
        this.updateProcessButton();

        console.log(`开始处理 ${this.files.length} 个文件`);

        try {
            // 逐个处理文件
            for (let i = 0; i < this.files.length; i++) {
                const fileInfo = this.files[i];
                fileInfo.status = 'processing';
                this.updateFileList();
                this.updateProgress(i, this.files.length);

                console.log(`开始处理: ${fileInfo.file.name}`);

                try {
                    const processedData = await this.processFile(fileInfo.file);
                    fileInfo.processedData = processedData;
                    fileInfo.status = 'completed';
                    this.processedFiles.push({
                        name: fileInfo.file.name,
                        data: processedData
                    });

                    console.log(`处理完成: ${fileInfo.file.name}, 生成${processedData.length - 1}行数据`);
                } catch (error) {
                    fileInfo.status = 'error';
                    console.error(`处理文件 ${fileInfo.file.name} 失败:`, error);
                }

                this.updateFileList();
            }

            this.updateProgress(this.files.length, this.files.length);
            this.showNotification('所有文件处理完成', 'success');

            console.log(`所有文件处理完成, 成功:${this.processedFiles.length}个, 失败:${this.files.length - this.processedFiles.length}个`);

            // 启用下载按钮
            document.getElementById('downloadBtn').disabled = false;

        } catch (error) {
            console.error('处理过程中出现错误:', error);
            this.showNotification('处理过程中出现错误', 'error');
        } finally {
            this.isProcessing = false;
            this.updateProcessButton();
        }
    }

    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    // 处理数据（翻译、计算Kdroi等）
                    this.processXLSXData(jsonData).then(resolve).catch(reject);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    async processXLSXData(xlsxData) {
        const headers = xlsxData[0];
        const rows = xlsxData.slice(1);

        console.log(`解析完成: ${rows.length}行数据, 检测到${headers.length}列`);

        // 查找列索引
        const keywordIndex = headers.findIndex(h => h.toLowerCase().includes('keyword'));
        const intentIndex = headers.findIndex(h => h.toLowerCase().includes('intent'));
        const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('volume'));
        const difficultyIndex = headers.findIndex(h => h.toLowerCase().includes('difficulty'));
        const cpcIndex = headers.findIndex(h => h.toLowerCase().includes('cpc'));

        console.log(`Keyword列:${keywordIndex}, Volume列:${volumeIndex}, Difficulty列:${difficultyIndex}, CPC列:${cpcIndex}`);

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
        const keywords = rows.map(row => row[keywordIndex]);
        const translations = await this.batchTranslateKeywords(keywords, rows.length);

        const processedRows = [];

        // 处理每一行数据
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

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

        return [newHeaders, ...processedRows];
    }

    async batchTranslateKeywords(keywords, totalRows) {
        if (!keywords || keywords.length === 0) {
            return [];
        }

        try {
            // 所有关键词都需要翻译成中文
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
                return keywords.map((keyword, index) => translationMap.get(index) || keyword);
            }

            console.log(`需要翻译: ${keywordsToTranslate.length}个关键词`);

            // 分批处理，每批1000个关键词
            const batchSize = 1000;
            const totalBatches = Math.ceil(keywordsToTranslate.length / batchSize);
            const results = new Map();

            console.log(`分${totalBatches}批处理, 第1批:${Math.min(batchSize, keywordsToTranslate.length)}个`);

            for (let i = 0; i < keywordsToTranslate.length; i += batchSize) {
                const batchNum = Math.floor(i / batchSize) + 1;
                const batch = keywordsToTranslate.slice(i, i + batchSize);

                const batchTranslations = await this.translateBatch(batch);
                batch.forEach((item, index) => {
                    results.set(item.index, batchTranslations[index]);
                });
            }

            // 构建最终结果
            const finalTranslations = [];
            let successCount = 0;
            let failureCount = 0;

            for (let i = 0; i < keywords.length; i++) {
                if (translationMap.has(i)) {
                    finalTranslations.push(translationMap.get(i));
                } else {
                    const translation = results.get(i) || keywords[i];
                    finalTranslations.push(translation);
                    if (translation !== keywords[i]) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                }
            }

            console.log(`翻译完成: 成功${successCount}个, 失败${failureCount}个`);
            return finalTranslations;

        } catch (error) {
            console.error('批量翻译失败:', error);
            return keywords; // 翻译失败时返回原词
        }
    }

    async translateBatch(batch) {
        const prompt = batch.map((item, index) =>
            `${index + 1}. ${item.keyword}`
        ).join('\n');

        try {
            const response = await fetch(`${this.apiConfig.endpoint}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiConfig.key}`
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

    
    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        const progressBar = document.getElementById('progressBar');

        progressBar.style.width = `${percentage}%`;

        if (percentage === 100) {
            progressBar.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
            document.getElementById('progressText').textContent = '处理完毕';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
            document.getElementById('progressText').textContent = `正在处理: ${current}/${total}`;
        }
    }

    async downloadMergedFile() {
        if (this.processedFiles.length === 0) {
            this.showNotification('没有可下载的文件', 'error');
            return;
        }

        try {
            // 创建合并的工作簿
            const wb = XLSX.utils.book_new();

            // 添加总览sheet（包含使用说明）
            const overviewData = [
                ['文件名', '词根', '原始关键词数量', '处理后行数', '处理状态', '处理时间'],
                ...this.processedFiles.map((file, index) => [
                    file.name,
                    this.extractWordRoot(file.name),
                    file.data.length - 1, // 减去表头
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
            overviewData[17][instructionsStartCol] = 'Google Trends: Google趋势链接';
            overviewData[18][instructionsStartCol] = 'Ahrefs Keyword Difficulty Checker: Ahrefs难度检查链接';
            overviewData[19][instructionsStartCol] = '';
            overviewData[20][instructionsStartCol] = '注意事项：';
            overviewData[21][instructionsStartCol] = '- 如需修改API配置，请在插件界面重新保存';
            overviewData[22][instructionsStartCol] = '- 翻译失败的关键词将显示"翻译失败"';
            overviewData[23][instructionsStartCol] = '- Kdroi值保留两位小数';

            const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
            XLSX.utils.book_append_sheet(wb, overviewWs, '总览');

            // 添加每个文件的数据表
            this.processedFiles.forEach(file => {
                const ws = XLSX.utils.aoa_to_sheet(file.data);
                const sheetName = file.name.replace(/\.[^/.]+$/, '').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // 下载文件
            XLSX.writeFile(wb, `关键词工具_合并结果_${new Date().toISOString().split('T')[0]}.xlsx`);
            this.showNotification('文件下载成功', 'success');

        } catch (error) {
            console.error('下载文件失败:', error);
            this.showNotification('文件下载失败', 'error');
        }
    }

    extractWordRoot(filename) {
        // 从文件名中提取词根
        const name = filename.replace(/\.[^/.]+$/, '');
        const parts = name.split(/[_\-]/);
        return parts[0] || name;
    }

    clearFiles() {
        this.files = [];
        this.processedFiles = [];
        this.updateFileList();
        this.updateProcessButton();
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '等待上传文件...';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new KeywordProcessor();
});