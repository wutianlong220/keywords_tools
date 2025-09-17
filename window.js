class KeywordProcessor {
    constructor() {
        this.files = [];
        this.processedFiles = [];
        this.isProcessing = false;

        // API配置
        this.apiConfig = {
            endpoint: '',
            key: ''
        };

        // 处理参数配置
        this.processingConfig = {
            batchSize: 40,              // 翻译数量，默认40
            concurrencyLimit: 25       // 并发数，默认25
        };

        // 其他常量
        this.REQUEST_TIMEOUT = 30000;   // 请求超时时间
        this.MAX_RETRIES = 9;           // 最大重试次数

        // 性能日志收集系统
        this.performanceLogs = [];
        this.timeMarkers = {};
        this.currentSessionId = Date.now();

        this.init();
    }

    init() {
        this.loadApiConfig();
        this.setupEventListeners();
        this.setupPerformanceLogging();
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

        // 帮助图标tooltip
        document.getElementById('helpIcon').addEventListener('mouseenter', this.showTooltip.bind(this));
        document.getElementById('helpIcon').addEventListener('mouseleave', this.hideTooltip.bind(this));

        // 输入验证事件
        document.getElementById('batchSize').addEventListener('input', this.validateBatchSizeInput.bind(this));
        document.getElementById('concurrencyLimit').addEventListener('input', this.validateConcurrencyLimitInput.bind(this));

        // 操作按钮
        document.getElementById('processBtn').addEventListener('click', this.startProcessing.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadMergedFile.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearFiles.bind(this));

        // 日志按钮
        document.getElementById('viewLogsBtn').addEventListener('click', this.viewLogs.bind(this));
        document.getElementById('exportLogsBtn').addEventListener('click', this.exportLogs.bind(this));
        document.getElementById('clearLogsBtn').addEventListener('click', this.clearLogs.bind(this));
    }

    setupPerformanceLogging() {
        console.log('关键词工具性能日志已启用');
        console.log('使用实例方法查看、清空和导出日志');
    }

    // 日志记录方法
    logPerformance(action, details = {}) {
        const logEntry = {
            timestamp: Date.now(),
            session: this.currentSessionId,
            action: action,
            details: details,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };

        this.performanceLogs.push(logEntry);

        // 同时输出到控制台
        console.log(`[关键词工具] ${action}`, details);
    }

    // 时间标记方法
    markTime(markerName) {
        const timestamp = Date.now();
        this.timeMarkers[markerName] = timestamp;
        this.logPerformance(`TIME_MARKER_${markerName}`, { timestamp });
        return timestamp;
    }

    // 计算时间差
    getTimeDiff(startMarker, endMarker = null) {
        const endTime = endMarker ? this.timeMarkers[endMarker] : Date.now();
        const startTime = this.timeMarkers[startMarker];
        return startTime ? endTime - startTime : null;
    }

    // 生成性能摘要
    generatePerformanceSummary() {
        const sessionLogs = this.performanceLogs.filter(log => log.session === this.currentSessionId);
        const summary = {
            sessionId: this.currentSessionId,
            totalLogs: sessionLogs.length,
            startTime: sessionLogs[0]?.timestamp || null,
            endTime: sessionLogs[sessionLogs.length - 1]?.timestamp || null,
            totalTime: null,
            apiCalls: sessionLogs.filter(log => log.action.includes('API')),
            fileOperations: sessionLogs.filter(log => log.action.includes('FILE')),
            timeMarkers: this.timeMarkers
        };

        if (summary.startTime && summary.endTime) {
            summary.totalTime = summary.endTime - summary.startTime;
        }

        return summary;
    }

    async loadApiConfig() {
        try {
            // 加载所有配置
            const result = await chrome.storage.local.get([
                'deepseek_api_endpoint',
                'deepseek_api_key',
                'batch_size',
                'concurrency_limit'
            ]);

            // API配置
            this.apiConfig.endpoint = result.deepseek_api_endpoint || '';
            this.apiConfig.key = result.deepseek_api_key || '';

            // 处理参数配置
            this.processingConfig.batchSize = result.batch_size || 40;
            this.processingConfig.concurrencyLimit = result.concurrency_limit || 25;

            // 设置界面值
            const batchSizeInput = document.getElementById('batchSize');
            const concurrencyLimitInput = document.getElementById('concurrencyLimit');

            document.getElementById('apiEndpoint').value = this.apiConfig.endpoint;
            document.getElementById('apiKey').value = this.apiConfig.key;
            batchSizeInput.value = this.processingConfig.batchSize;
            concurrencyLimitInput.value = this.processingConfig.concurrencyLimit;

            // 设置占位符和默认值
            if (!batchSizeInput.value) {
                batchSizeInput.value = '40';
            }
            if (!concurrencyLimitInput.value) {
                concurrencyLimitInput.value = '25';
            }

            if (this.apiConfig.endpoint && this.apiConfig.key) {
                console.log('API配置已加载');
            }
            console.log(`处理参数已加载 - 批次大小: ${this.processingConfig.batchSize}, 并发数: ${this.processingConfig.concurrencyLimit}`);

            this.updateProcessButton();
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async saveApiConfig() {
        const endpoint = document.getElementById('apiEndpoint').value.trim();
        const key = document.getElementById('apiKey').value.trim();
        const batchSize = parseInt(document.getElementById('batchSize').value);
        const concurrencyLimit = parseInt(document.getElementById('concurrencyLimit').value);

        // 验证API配置
        if (!endpoint || !key) {
            this.showNotification('请填写完整的API配置', 'error');
            return;
        }

        // 验证处理参数配置
        if (!this.validateBatchSize(batchSize)) {
            this.showNotification('翻译数量必须在15-85之间', 'error');
            return;
        }

        if (!this.validateConcurrencyLimit(concurrencyLimit)) {
            this.showNotification('并发数必须在2-25之间', 'error');
            return;
        }

        try {
            // 保存所有配置
            await chrome.storage.local.set({
                'deepseek_api_endpoint': endpoint,
                'deepseek_api_key': key,
                'batch_size': batchSize,
                'concurrency_limit': concurrencyLimit
            });

            // 更新内存中的配置
            this.apiConfig.endpoint = endpoint;
            this.apiConfig.key = key;
            this.processingConfig.batchSize = batchSize;
            this.processingConfig.concurrencyLimit = concurrencyLimit;

            // 清除输入验证状态
            document.getElementById('batchSize').style.borderColor = '';
            document.getElementById('concurrencyLimit').style.borderColor = '';

            this.showNotification('插件配置保存成功', 'success');
            this.updateProcessButton();
            console.log(`配置已保存 - 批次大小: ${batchSize}, 并发数: ${concurrencyLimit}`);
        } catch (error) {
            console.error('配置保存失败:', error);
            this.showNotification('配置保存失败', 'error');
        }
    }

    // 验证批次大小
    validateBatchSize(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 15 && num <= 85;
    }

    // 验证并发数
    validateConcurrencyLimit(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 2 && num <= 25;
    }

    // 实时验证批次大小输入
    validateBatchSizeInput(event) {
        const input = event.target;
        const value = input.value;

        if (value === '') {
            input.style.borderColor = '';
            return;
        }

        if (this.validateBatchSize(value)) {
            input.style.borderColor = '#28a745';
        } else {
            input.style.borderColor = '#dc3545';
        }
    }

    // 实时验证并发数输入
    validateConcurrencyLimitInput(event) {
        const input = event.target;
        const value = input.value;

        if (value === '') {
            input.style.borderColor = '';
            return;
        }

        if (this.validateConcurrencyLimit(value)) {
            input.style.borderColor = '#28a745';
        } else {
            input.style.borderColor = '#dc3545';
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

        // 清空之前的日志，开始新的会话
        this.clearPreviousLogs();

        this.isProcessing = true;
        this.processedFiles = [];
        this.updateProcessButton();

        // 开始性能监控
        this.markTime('处理开始');
        this.logPerformance('处理开始', { fileCount: this.files.length });

        console.log(`开始处理 ${this.files.length} 个文件（单词海洋模式）`);

        try {
            // 初始化进度条为单词海洋模式
            document.getElementById('progressText').textContent = '单词海洋处理准备中...';
            document.getElementById('progressBar').style.width = '0%';
            document.getElementById('progressBar').style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';

            // 单词海洋优化：一次性扫描所有文件，构建关键词流
            const oceanProcessingStartTime = this.markTime('单词海洋处理开始');
            this.logPerformance('OCEAN_PROCESSING_START', {
                fileCount: this.files.length,
                mode: 'keyword_ocean'
            });

            // 阶段1：文件扫描和数据预处理
            const preprocessingStartTime = this.markTime('文件预处理开始');
            this.logPerformance('FILE_PREPROCESSING_START', {
                fileCount: this.files.length
            });

            const { fileMapping, keywordStream } = await this.preprocessFilesForOcean();

            const preprocessingEndTime = this.markTime('文件预处理完成');
            const preprocessingTime = this.getTimeDiff('文件预处理开始', '文件预处理完成');

            this.logPerformance('FILE_PREPROCESSING_COMPLETE', {
                fileCount: this.files.length,
                totalKeywords: keywordStream.length,
                processTime: preprocessingTime
            });

            console.log(`文件预处理完成: 扫描${fileMapping.length}个文件，构建${keywordStream.length}个关键词流，耗时${preprocessingTime}ms`);

            // 阶段2：批次切割和映射
            const batchCreationStartTime = this.markTime('批次切割开始');
            this.logPerformance('BATCH_CREATION_START', {
                keywordCount: keywordStream.length,
                batchSize: this.processingConfig.batchSize
            });

            const batches = this.createBatchesForOcean(keywordStream);

            const batchCreationEndTime = this.markTime('批次切割完成');
            const batchCreationTime = this.getTimeDiff('批次切割开始', '批次切割完成');

            this.logPerformance('BATCH_CREATION_COMPLETE', {
                totalBatches: batches.length,
                totalKeywords: keywordStream.length,
                processTime: batchCreationTime
            });

            console.log(`批次切割完成: 创建${batches.length}个批次，总关键词${keywordStream.length}个，耗时${batchCreationTime}ms`);

            // 阶段3：并发批次处理
            const batchProcessingStartTime = this.markTime('批次处理开始');
            this.logPerformance('BATCH_PROCESSING_START', {
                batchCount: batches.length,
                concurrencyLimit: this.processingConfig.concurrencyLimit
            });

            // 初始化关键词进度跟踪
            this.oceanKeywordProgress = {
                total: keywordStream.length,
                processed: 0
            };

            const translationResults = await this.processBatchesForOcean(batches, keywordStream.length);

            const batchProcessingEndTime = this.markTime('批次处理完成');
            const batchProcessingTime = this.getTimeDiff('批次处理开始', '批次处理完成');

            this.logPerformance('BATCH_PROCESSING_COMPLETE', {
                batchCount: batches.length,
                totalKeywords: keywordStream.length,
                processTime: batchProcessingTime,
                avgTimePerKeyword: Math.round(batchProcessingTime / keywordStream.length)
            });

            console.log(`批次处理完成: 处理${batches.length}个批次，${keywordStream.length}个关键词，耗时${batchProcessingTime}ms`);

            // 阶段4：结果分配和文件重建
            const distributionStartTime = this.markTime('结果分配开始');
            this.logPerformance('RESULT_DISTRIBUTION_START', {
                fileCount: fileMapping.length,
                keywordCount: keywordStream.length
            });

            const processedFileMapping = await this.distributeResultsForOcean(translationResults, fileMapping, keywordStream);

            const distributionEndTime = this.markTime('结果分配完成');
            const distributionTime = this.getTimeDiff('结果分配开始', '结果分配完成');

            this.logPerformance('RESULT_DISTRIBUTION_COMPLETE', {
                fileCount: fileMapping.length,
                keywordCount: keywordStream.length,
                processTime: distributionTime
            });

            console.log(`结果分配完成: 重建${processedFileMapping.length}个文件，耗时${distributionTime}ms`);

            // 完成单词海洋处理
            const oceanProcessingEndTime = this.markTime('单词海洋处理完成');
            const oceanProcessingTime = this.getTimeDiff('单词海洋处理开始', '单词海洋处理完成');

            this.logPerformance('OCEAN_PROCESSING_COMPLETE', {
                fileCount: fileMapping.length,
                totalKeywords: keywordStream.length,
                totalBatches: batches.length,
                totalTime: oceanProcessingTime
            });

            // 转换为原有的processedFiles格式
            this.processedFiles = processedFileMapping.map(fileInfo => ({
                name: fileInfo.fileName,
                data: fileInfo.processedData
            }));

            // 更新文件状态
            this.processedFiles.forEach(processedFile => {
                const originalFileInfo = this.files.find(f => f.file.name === processedFile.name);
                if (originalFileInfo) {
                    originalFileInfo.status = 'completed';
                    originalFileInfo.processedData = processedFile.data;
                }
            });

            this.updateFileList();
            this.updateOceanProgress();

            // 确保进度条显示完成状态
            if (this.oceanKeywordProgress) {
                this.oceanKeywordProgress.processed = this.oceanKeywordProgress.total;
                this.updateOceanProgress();
            }
            this.markTime('处理完成');
            const totalTime = this.getTimeDiff('处理开始', '处理完成');

            this.logPerformance('处理完成', {
                totalFiles: this.files.length,
                successFiles: this.processedFiles.length,
                failedFiles: this.files.length - this.processedFiles.length,
                totalTime: totalTime,
                mode: 'keyword_ocean'
            });

            this.showNotification('所有文件处理完成（单词海洋模式）', 'success');

            console.log(`单词海洋处理完成: 成功${this.processedFiles.length}个文件，${keywordStream.length}个关键词，总耗时${totalTime}ms`);

            // 启用下载按钮
            document.getElementById('downloadBtn').disabled = false;

        } catch (error) {
            this.markTime('处理失败');
            const totalTime = this.getTimeDiff('处理开始', '处理失败');

            this.logPerformance('处理失败', {
                error: error.message,
                totalTime: totalTime,
                mode: 'keyword_ocean'
            });

            console.error('单词海洋处理过程中出现错误:', error);
            this.showNotification('处理过程中出现错误', 'error');
        } finally {
            this.isProcessing = false;
            this.updateProcessButton();
        }
    }

    
    
    async batchTranslateKeywords(keywords, totalRows) {
        if (!keywords || keywords.length === 0) {
            return [];
        }

        this.markTime('批量翻译开始');
        this.logPerformance('TRANSLATION_START', {
            keywordCount: keywords.length,
            totalRows: totalRows
        });

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
            const totalBatches = Math.ceil(keywordsToTranslate.length / this.processingConfig.batchSize);
            console.log(`总共分为 ${totalBatches} 批，每批 ${this.processingConfig.batchSize} 个关键词，并发数 ${this.processingConfig.concurrencyLimit}`);

            // 初始化结果数组
            const finalTranslations = new Array(keywords.length);

            // 先填充空关键词和映射的结果
            for (let i = 0; i < keywords.length; i++) {
                if (translationMap.has(i)) {
                    finalTranslations[i] = translationMap.get(i);
                }
            }

            // 并发处理所有批次
            for (let batchGroup = 0; batchGroup < totalBatches; batchGroup += this.processingConfig.concurrencyLimit) {
                const batchGroupStartTime = this.markTime(`批次组${batchGroup}_开始`);
                const currentBatchPromises = [];
                const currentBatchCount = Math.min(this.processingConfig.concurrencyLimit, totalBatches - batchGroup);

                this.logPerformance('BATCH_GROUP_START', {
                    batchGroup: batchGroup,
                    batchSize: currentBatchCount,
                    totalBatches: totalBatches
                });

                console.log(`开始处理批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount}`);

                // 创建当前批次的并发请求
                for (let j = 0; j < currentBatchCount; j++) {
                    const batchIndex = batchGroup + j;
                    const startIndex = batchIndex * this.processingConfig.batchSize;
                    const endIndex = Math.min(startIndex + this.processingConfig.batchSize, keywordsToTranslate.length);
                    const batchKeywords = keywordsToTranslate.slice(startIndex, endIndex);

                    this.logPerformance('BATCH_REQUEST_CREATED', {
                        batchIndex: batchIndex,
                        startIndex: startIndex,
                        endIndex: endIndex,
                        keywordCount: batchKeywords.length
                    });

                    console.log(`创建翻译请求: 批次${batchIndex + 1}, 关键词${startIndex + 1}-${endIndex}`);

                    // 创建带索引的翻译请求
                    currentBatchPromises.push(this.translateBatchWithIndex(batchKeywords, startIndex));
                }

                try {
                    // 等待当前批次组的所有并发请求完成
                    const batchResults = await Promise.all(currentBatchPromises);
                    const batchGroupEndTime = this.markTime(`批次组${batchGroup}_完成`);
                    const batchGroupTime = this.getTimeDiff(`批次组${batchGroup}_开始`, `批次组${batchGroup}_完成`);

                    this.logPerformance('BATCH_GROUP_COMPLETE', {
                        batchGroup: batchGroup,
                        batchSize: currentBatchCount,
                        processTime: batchGroupTime,
                        resultsCount: batchResults.length
                    });

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

                    console.log(`批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount} 处理完成`);

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

            this.markTime('批量翻译完成');
            const totalTranslationTime = this.getTimeDiff('批量翻译开始', '批量翻译完成');

            this.logPerformance('TRANSLATION_COMPLETE', {
                keywordCount: keywords.length,
                totalTime: totalTranslationTime,
                avgTimePerKeyword: Math.round(totalTranslationTime / keywords.length),
                totalBatches: totalBatches
            });

            console.log(`并发批量翻译完成, 总耗时:${totalTranslationTime}ms, 平均每个关键词:${Math.round(totalTranslationTime / keywords.length)}ms`);
            return finalTranslations;

        } catch (error) {
            this.markTime('批量翻译失败');
            const totalTranslationTime = this.getTimeDiff('批量翻译开始', '批量翻译失败');

            this.logPerformance('TRANSLATION_ERROR', {
                error: error.message,
                totalTime: totalTranslationTime,
                keywordCount: keywords.length
            });

            console.error('并发批量翻译失败:', error);
            return keywords; // 翻译失败时返回原词
        }
    }

  
    async translateBatchWithIndex(batch, startIndex) {
        const prompt = batch.map((item, index) =>
            `${index + 1}. ${item.keyword}`
        ).join('\n');

        const requestStartTime = this.markTime(`API请求${startIndex}_开始`);
        this.logPerformance('API_REQUEST_START', {
            startIndex: startIndex,
            keywordCount: batch.length,
            promptLength: prompt.length
        });

        console.log(`开始翻译批次 ${startIndex + 1}-${startIndex + batch.length}，共 ${batch.length} 个关键词`);

        let lastError = null;

        // 重试机制
        for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
            let timeoutId;
            try {
                // 添加超时控制
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

                const apiCallStartTime = this.markTime(`API调用${startIndex}_尝试${attempt}_开始`);
                this.logPerformance('API_CALL_START', {
                    startIndex: startIndex,
                    attempt: attempt,
                    keywordCount: batch.length
                });

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
                        max_tokens: Math.min(batch.length * 20, 4000), // 动态调整token数量
                        temperature: 0.1
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const apiCallEndTime = this.markTime(`API调用${startIndex}_尝试${attempt}_完成`);
                const apiCallTime = this.getTimeDiff(`API调用${startIndex}_尝试${attempt}_开始`, `API调用${startIndex}_尝试${attempt}_完成`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API错误详情:', errorText);

                    this.logPerformance('API_CALL_ERROR', {
                        startIndex: startIndex,
                        attempt: attempt,
                        status: response.status,
                        statusText: response.statusText,
                        apiCallTime: apiCallTime
                    });

                    throw new Error(`API请求失败: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();
                const translationText = data.choices[0].message.content.trim();

                this.logPerformance('API_CALL_SUCCESS', {
                    startIndex: startIndex,
                    attempt: attempt,
                    apiCallTime: apiCallTime,
                    responseLength: translationText.length,
                    keywordCount: batch.length
                });

                console.log(`批次 ${startIndex} 第${attempt}次尝试翻译响应长度: ${translationText.length}, API耗时:${apiCallTime}ms`);

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

                const requestEndTime = this.markTime(`API请求${startIndex}_完成`);
                const requestTotalTime = this.getTimeDiff(`API请求${startIndex}_开始`, `API请求${startIndex}_完成`);

                this.logPerformance('API_REQUEST_COMPLETE', {
                    startIndex: startIndex,
                    totalTime: requestTotalTime,
                    attempts: attempt,
                    keywordCount: batch.length,
                    success: true
                });

                // 返回带索引的结果
                return {
                    startIndex: startIndex,
                    translations: translations
                };

            } catch (error) {
                clearTimeout(timeoutId); // 清理timeoutId，防止abort后续请求
                lastError = error;
                console.error(`批次 ${startIndex} 第${attempt}次尝试失败:`, error);

                this.logPerformance('API_CALL_ATTEMPT_ERROR', {
                    startIndex: startIndex,
                    attempt: attempt,
                    error: error.message
                });

                // 如果不是最后一次尝试，等待一段时间后重试
                if (attempt <= this.MAX_RETRIES) {
                    const delayTime = attempt * 1000; // 递增延迟：1秒，2秒
                    console.log(`批次 ${startIndex} 第${attempt}次尝试失败，${delayTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delayTime));
                }
            }
        }

        // 所有重试都失败，返回原始关键词
        const requestEndTime = this.markTime(`API请求${startIndex}_失败`);
        const requestTotalTime = this.getTimeDiff(`API请求${startIndex}_开始`, `API请求${startIndex}_失败`);

        this.logPerformance('API_REQUEST_FAILED', {
            startIndex: startIndex,
            totalTime: requestTotalTime,
            keywordCount: batch.length,
            error: lastError.message
        });

        console.error(`批次 ${startIndex} 所有重试都失败，返回原始关键词`);
        return {
            startIndex: startIndex,
            translations: batch.map(item => item.keyword)
        };
    }

    
    // 单词海洋模式下的关键词级进度更新
    updateOceanProgress() {
        if (!this.oceanKeywordProgress) return;

        const { processed, total } = this.oceanKeywordProgress;
        const percentage = Math.round((processed / total) * 100);
        const progressBar = document.getElementById('progressBar');

        progressBar.style.width = `${percentage}%`;

        if (percentage === 100) {
            progressBar.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
            document.getElementById('progressText').textContent = '处理完毕';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
            document.getElementById('progressText').textContent = `${processed}/${total}`;
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
        // 从文件名中提取词根：去掉 _broad-match_ 及其后面的所有内容
        const name = filename.replace(/\.[^/.]+$/, '');
        const broadMatchIndex = name.indexOf('_broad-match_');
        if (broadMatchIndex !== -1) {
            return name.substring(0, broadMatchIndex);
        }
        return name;
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

    // 清空之前的日志，开始新的会话
    clearPreviousLogs() {
        this.performanceLogs = [];
        this.timeMarkers = {};
        this.currentSessionId = Date.now();

        console.log('=== 新的日志会话开始 ===');
        console.log(`会话ID: ${this.currentSessionId}`);
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

    // 显示tooltip
    showTooltip(event) {
        const helpIcon = document.getElementById('helpIcon');
        const tooltip = document.getElementById('tooltip');
        const tooltipText = '每次请求最多处理85个单词，数量太多容易导致长尾词翻译不完全，数量太少则会导致文件处理速度太慢。请根据实际情况自行填写。';

        tooltip.textContent = tooltipText;

        // 计算位置
        const iconRect = helpIcon.getBoundingClientRect();
        tooltip.style.left = iconRect.left + 'px';
        tooltip.style.top = (iconRect.bottom + 10) + 'px';
        tooltip.style.transform = 'translateX(-50%)';

        tooltip.classList.add('show');
    }

    // 隐藏tooltip
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('show');
    }

    // 获取日志数据
    getKeywordToolLogs() {
        return {
            sessionId: this.currentSessionId,
            logs: this.performanceLogs,
            timeMarkers: this.timeMarkers,
            summary: this.generatePerformanceSummary()
        };
    }

    // 查看日志
    viewLogs() {
        const logsData = this.getKeywordToolLogs();
        console.log('=== 关键词工具日志 ===', logsData);

        // 创建日志窗口
        const logWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        logWindow.document.write(`
            <html>
            <head>
                <title>关键词工具日志</title>
                <style>
                    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                    .summary { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
                    .log-entry { background: white; margin: 10px 0; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea; }
                    .timestamp { color: #666; font-size: 12px; }
                    .action { font-weight: bold; color: #333; }
                    .details { color: #555; margin-top: 5px; }
                </style>
            </head>
            <body>
                <h1>关键词工具日志</h1>
                <div class="summary">
                    <h2>性能摘要</h2>
                    <p>会话ID: ${logsData.sessionId}</p>
                    <p>总日志数: ${logsData.summary.totalLogs}</p>
                    <p>API调用数: ${logsData.summary.apiCalls.length}</p>
                    <p>文件操作数: ${logsData.summary.fileOperations.length}</p>
                    <p>总耗时: ${logsData.summary.totalTime ? Math.round(logsData.summary.totalTime / 1000) + '秒' : '进行中'}</p>
                </div>
                <div class="logs">
                    ${logsData.logs.slice(-50).map(log => `
                        <div class="log-entry">
                            <div class="timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                            <div class="action">${log.action}</div>
                            <div class="details">${JSON.stringify(log.details, null, 2)}</div>
                        </div>
                    `).join('')}
                </div>
            </body>
            </html>
        `);
        logWindow.document.close();

        this.showNotification('日志已在新窗口中打开', 'info');
    }

    // 导出日志
    exportLogs() {
        const logsData = this.getKeywordToolLogs();
        const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keyword-tool-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('日志已导出', 'success');
    }

    // 清空日志
    clearLogs() {
        if (confirm('确定要清空所有日志吗？')) {
            this.clearPreviousLogs();
            this.showNotification('日志已清空', 'info');
        }
    }

    // ========== 单词海洋优化方法 ==========

    // 阶段1：文件扫描和数据预处理
    async preprocessFilesForOcean() {
        const fileMapping = [];
        const keywordStream = [];

        // 扫描所有文件
        for (let i = 0; i < this.files.length; i++) {
            const fileInfo = this.files[i];

            try {
                const data = await this.processFileForOcean(fileInfo.file);
                const keywords = this.extractKeywordsFromData(data);

                // 记录文件信息
                fileMapping.push({
                    fileIndex: i,
                    fileName: fileInfo.file.name,
                    fileSize: fileInfo.file.size,
                    keywordCount: keywords.length,
                    originalData: data,
                    processedData: null
                });

                // 构建关键词流
                keywords.forEach((keyword, wordIndex) => {
                    keywordStream.push({
                        fileIndex: i,
                        wordIndex: wordIndex,
                        keyword: keyword,
                        translation: null
                    });
                });

                console.log(`扫描文件 ${i + 1}/${this.files.length}: ${fileInfo.file.name}, ${keywords.length} 个关键词`);

            } catch (error) {
                console.error(`扫描文件 ${fileInfo.file.name} 失败:`, error);
                // 即使文件扫描失败，也要记录空文件信息
                fileMapping.push({
                    fileIndex: i,
                    fileName: fileInfo.file.name,
                    fileSize: fileInfo.file.size,
                    keywordCount: 0,
                    originalData: null,
                    processedData: null,
                    error: error.message
                });
            }
        }

        return { fileMapping, keywordStream };
    }

    // 为单词海洋处理单个文件
    async processFileForOcean(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    // 从数据中提取关键词
    extractKeywordsFromData(data) {
        if (!data || data.length < 2) return [];

        const headers = data[0];
        const rows = data.slice(1);

        // 查找Keyword列
        const keywordIndex = headers.findIndex(h => h && h.toLowerCase().includes('keyword'));
        if (keywordIndex === -1) {
            throw new Error('未找到Keyword列');
        }

        // 提取所有关键词
        return rows.map(row => row[keywordIndex]).filter(keyword => keyword && keyword.trim());
    }

    // 阶段2：批次切割和映射
    createBatchesForOcean(keywordStream) {
        const batches = [];
        const batchSize = this.processingConfig.batchSize;

        for (let i = 0; i < keywordStream.length; i += batchSize) {
            const endIndex = Math.min(i + batchSize, keywordStream.length);
            const batchKeywords = keywordStream.slice(i, endIndex);

            batches.push({
                batchIndex: Math.floor(i / batchSize),
                streamStartIndex: i,
                streamEndIndex: endIndex - 1,
                keywords: batchKeywords.map(item => item.keyword),
                streamIndices: batchKeywords.map((_, index) => i + index)
            });
        }

        return batches;
    }

    // 阶段3：并发批次处理
    async processBatchesForOcean(batches, totalKeywordCount) {
        const results = new Array(totalKeywordCount);
        const totalBatches = batches.length;

        // 分组并发处理
        for (let batchGroup = 0; batchGroup < totalBatches; batchGroup += this.processingConfig.concurrencyLimit) {
            const currentBatchPromises = [];
            const currentBatchCount = Math.min(this.processingConfig.concurrencyLimit, totalBatches - batchGroup);

            this.markTime(`批次组${batchGroup}_开始`);
            this.logPerformance('BATCH_GROUP_START', {
                batchGroup: batchGroup,
                batchSize: currentBatchCount,
                totalBatches: totalBatches
            });

            console.log(`开始处理批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount}`);

            // 创建当前批次的并发请求
            for (let j = 0; j < currentBatchCount; j++) {
                const batchIndex = batchGroup + j;
                const batch = batches[batchIndex];

                currentBatchPromises.push(
                    this.translateBatchForOcean(batch, batchIndex)
                );
            }

            try {
                // 等待当前批次组完成
                const batchResults = await Promise.all(currentBatchPromises);
                this.markTime(`批次组${batchGroup}_完成`);
                const batchGroupTime = this.getTimeDiff(`批次组${batchGroup}_开始`, `批次组${batchGroup}_完成`);

                this.logPerformance('BATCH_GROUP_COMPLETE', {
                    batchGroup: batchGroup,
                    batchSize: currentBatchCount,
                    processTime: batchGroupTime,
                    resultsCount: batchResults.length
                });

                // 将结果分配到关键词流
                batchResults.forEach((result, groupIndex) => {
                    const batchIndex = batchGroup + groupIndex;
                    const batch = batches[batchIndex];

                    result.translations.forEach((translation, index) => {
                        const streamIndex = batch.streamIndices[index];
                        results[streamIndex] = translation;
                    });
                });

                // 更新关键词进度（考虑最后一个批次可能不满）
                const actualProcessedInThisGroup = Math.min(
                    currentBatchCount * this.processingConfig.batchSize,
                    this.oceanKeywordProgress.total - this.oceanKeywordProgress.processed
                );
                this.oceanKeywordProgress.processed += actualProcessedInThisGroup;
                this.updateOceanProgress();

                console.log(`批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount} 处理完成`);

            } catch (error) {
                console.error(`批次组 ${batchGroup + 1}-${batchGroup + currentBatchCount} 处理失败:`, error);
                throw error;
            }
        }

        return results;
    }

    // 为单词海洋翻译批次
    async translateBatchForOcean(batch, batchIndex) {
        const prompt = batch.keywords.map((keyword, index) =>
            `${index + 1}. ${keyword}`
        ).join('\n');

        const requestStartTime = this.markTime(`海洋批次${batchIndex}_开始`);
        this.logPerformance('OCEAN_BATCH_REQUEST_START', {
            batchIndex: batchIndex,
            keywordCount: batch.keywords.length,
            promptLength: prompt.length
        });

        console.log(`开始翻译海洋批次 ${batchIndex + 1}, 关键词数量: ${batch.keywords.length}`);

        let lastError = null;

        // 重试机制
        for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
            let timeoutId;
            try {
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

                const apiCallStartTime = this.markTime(`海洋API调用${batchIndex}_尝试${attempt}_开始`);
                this.logPerformance('OCEAN_API_CALL_START', {
                    batchIndex: batchIndex,
                    attempt: attempt,
                    keywordCount: batch.keywords.length
                });

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
                        max_tokens: Math.min(batch.keywords.length * 20, 4000),
                        temperature: 0.1
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const apiCallEndTime = this.markTime(`海洋API调用${batchIndex}_尝试${attempt}_完成`);
                const apiCallTime = this.getTimeDiff(`海洋API调用${batchIndex}_尝试${attempt}_开始`, `海洋API调用${batchIndex}_尝试${attempt}_完成`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API错误详情:', errorText);

                    this.logPerformance('OCEAN_API_CALL_ERROR', {
                        batchIndex: batchIndex,
                        attempt: attempt,
                        status: response.status,
                        statusText: response.statusText,
                        apiCallTime: apiCallTime
                    });

                    throw new Error(`API请求失败: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();
                const translationText = data.choices[0].message.content.trim();

                this.logPerformance('OCEAN_API_CALL_SUCCESS', {
                    batchIndex: batchIndex,
                    attempt: attempt,
                    apiCallTime: apiCallTime,
                    responseLength: translationText.length,
                    keywordCount: batch.keywords.length
                });

                // 解析翻译结果
                const lines = translationText.split('\n').filter(line => line.trim());
                const translations = [];

                for (let i = 0; i < batch.keywords.length; i++) {
                    const line = lines[i] || '';
                    const translation = line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim();
                    translations.push(translation || batch.keywords[i]);
                }

                const requestEndTime = this.markTime(`海洋批次${batchIndex}_完成`);
                const requestTotalTime = this.getTimeDiff(`海洋批次${batchIndex}_开始`, `海洋批次${batchIndex}_完成`);

                this.logPerformance('OCEAN_BATCH_REQUEST_COMPLETE', {
                    batchIndex: batchIndex,
                    totalTime: requestTotalTime,
                    attempts: attempt,
                    keywordCount: batch.keywords.length,
                    success: true
                });

                console.log(`海洋批次 ${batchIndex} 第${attempt}次尝试翻译完成，成功翻译 ${translations.length} 个关键词`);

                return {
                    batchIndex: batchIndex,
                    translations: translations
                };

            } catch (error) {
                clearTimeout(timeoutId); // 清理timeoutId，防止abort后续请求
                lastError = error;
                console.error(`海洋批次 ${batchIndex} 第${attempt}次尝试失败:`, error);

                this.logPerformance('OCEAN_API_CALL_ATTEMPT_ERROR', {
                    batchIndex: batchIndex,
                    attempt: attempt,
                    error: error.message
                });

                if (attempt <= this.MAX_RETRIES) {
                    const delayTime = attempt * 1000;
                    console.log(`海洋批次 ${batchIndex} 第${attempt}次尝试失败，${delayTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delayTime));
                }
            }
        }

        // 所有重试都失败，返回原始关键词
        const requestEndTime = this.markTime(`海洋批次${batchIndex}_失败`);
        const requestTotalTime = this.getTimeDiff(`海洋批次${batchIndex}_开始`, `海洋批次${batchIndex}_失败`);

        this.logPerformance('OCEAN_BATCH_REQUEST_FAILED', {
            batchIndex: batchIndex,
            totalTime: requestTotalTime,
            keywordCount: batch.keywords.length,
            error: lastError.message
        });

        console.error(`海洋批次 ${batchIndex} 所有重试都失败，返回原始关键词`);
        return {
            batchIndex: batchIndex,
            translations: batch.keywords.map(keyword => keyword)
        };
    }

    // 阶段4：结果分配和文件重建（包含日志兼容性）
    async distributeResultsForOcean(translationResults, fileMapping, keywordStream) {
        // 将翻译结果填充到关键词流
        translationResults.forEach((translation, index) => {
            if (keywordStream[index]) {
                keywordStream[index].translation = translation;
            }
        });

        // 按文件重建数据（在此处模拟原有的文件级日志以保持兼容性）
        for (let fileIndex = 0; fileIndex < fileMapping.length; fileIndex++) {
            const fileInfo = fileMapping[fileIndex];

            if (!fileInfo.originalData || fileInfo.error) {
                console.log(`跳过错误文件: ${fileInfo.fileName}`);
                continue;
            }

            const fileStartTime = this.markTime(`文件${fileIndex}_开始`);

            // 模拟原有的文件处理开始日志
            this.logPerformance('FILE_PROCESSING_START', {
                fileName: fileInfo.fileName,
                fileSize: fileInfo.fileSize,
                fileIndex: fileIndex
            });

            console.log(`开始重建文件: ${fileInfo.fileName}`);

            try {
                // 重建文件数据
                const processedData = this.reconstructFileData(fileInfo, keywordStream);
                const fileEndTime = this.markTime(`文件${fileIndex}_完成`);
                const fileProcessTime = this.getTimeDiff(`文件${fileIndex}_开始`, `文件${fileIndex}_完成`);

                fileInfo.processedData = processedData;

                // 模拟原有的文件处理完成日志
                this.logPerformance('FILE_PROCESSING_COMPLETE', {
                    fileName: fileInfo.fileName,
                    processTime: fileProcessTime,
                    rowsGenerated: processedData.length - 1,
                    fileIndex: fileIndex
                });

                console.log(`重建完成: ${fileInfo.fileName}, 生成${processedData.length - 1}行数据, 耗时${fileProcessTime}ms`);

            } catch (error) {
                const fileEndTime = this.markTime(`文件${fileIndex}_失败`);
                const fileProcessTime = this.getTimeDiff(`文件${fileIndex}_开始`, `文件${fileIndex}_失败`);

                // 模拟原有的文件处理错误日志
                this.logPerformance('FILE_PROCESSING_ERROR', {
                    fileName: fileInfo.fileName,
                    processTime: fileProcessTime,
                    error: error.message,
                    fileIndex: fileIndex
                });

                console.error(`重建文件 ${fileInfo.fileName} 失败:`, error);
            }
        }

        return fileMapping;
    }

    // 重建文件数据
    reconstructFileData(fileInfo, keywordStream) {
        const originalData = fileInfo.originalData;
        const headers = originalData[0];
        const rows = originalData.slice(1);

        // 查找列索引
        const keywordIndex = headers.findIndex(h => h && h.toLowerCase().includes('keyword'));
        const volumeIndex = headers.findIndex(h => h && h.toLowerCase().includes('volume'));
        const difficultyIndex = headers.findIndex(h => h && h.toLowerCase().includes('difficulty'));
        const cpcIndex = headers.findIndex(h => h && h.toLowerCase().includes('cpc'));

        if (keywordIndex === -1) {
            throw new Error('未找到Keyword列');
        }

        // 构建新的表头
        const newHeaders = [...headers];
        newHeaders.splice(keywordIndex + 1, 0, 'Translation');

        // 计算CPC列的位置
        const cpcPosition = cpcIndex !== -1 ? cpcIndex + (cpcIndex > keywordIndex ? 1 : 0) : headers.length;
        newHeaders.splice(cpcPosition + 1, 0, 'Kdroi');
        newHeaders.splice(cpcPosition + 2, 0, 'SERP');
        newHeaders.splice(cpcPosition + 3, 0, 'Google Trends');
        newHeaders.splice(cpcPosition + 4, 0, 'Ahrefs Keyword Difficulty Checker');

        // 找到属于这个文件的所有关键词
        const fileKeywords = keywordStream.filter(item => item.fileIndex === fileInfo.fileIndex);

        const processedRows = [];

        // 处理每一行数据
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const newRow = [...row];
            const keyword = row[keywordIndex];

            // 找到对应的翻译结果
            const keywordInfo = fileKeywords.find(item => item.wordIndex === i);
            const translation = keywordInfo ? keywordInfo.translation : keyword;

            // 插入翻译
            newRow.splice(keywordIndex + 1, 0, translation);

            // 计算Kdroi
            const volume = parseFloat(row[volumeIndex]) || 0;
            const difficulty = parseFloat(row[difficultyIndex]) || 1;
            const cpc = parseFloat(row[cpcIndex]) || 0;
            const kdroi = difficulty > 0 ? parseFloat(((volume * cpc) / difficulty).toFixed(2)) : 0.00;

            // 计算CPC列在新行中的位置
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
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new KeywordProcessor();
});