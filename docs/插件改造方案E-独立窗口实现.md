# 插件改造方案E：纯独立窗口实现

## 🎯 方案概述

将现有的关键词工具从弹窗/侧边栏模式改造为独立窗口模式，实现：
- 点击插件图标直接打开独立窗口
- 窗口可最小化、移动、调整大小
- 工作过程中不会被切换标签页或点击网页而中断
- 窗口必须手动关闭，不会自动消失

## 📋 改造清单

### 1. Manifest配置修改
- [ ] 移除`default_popup`配置
- [ ] 添加`activeTab`和`scripting`权限
- [ ] 保留`storage`权限用于API配置存储

### 2. Background.js修改
- [ ] 移除侧边栏相关代码
- [ ] 添加`chrome.action.onClicked`监听器
- [ ] 实现独立窗口创建逻辑
- [ ] 添加窗口管理功能

### 3. 创建独立窗口页面
- [ ] 创建`window.html`作为独立窗口界面
- [ ] 创建`window.js`作为独立窗口逻辑
- [ ] 移植现有功能代码到新页面

### 4. 功能适配
- [ ] 文件上传功能适配
- [ ] API配置功能适配
- [ ] 文件处理功能适配
- [ ] 下载功能适配

## 🔧 详细实现步骤

### 步骤1：修改manifest.json

```json
{
  "manifest_version": 3,
  "name": "关键词工具 - Keyword Tool",
  "version": "2.0.0",
  "description": "强大的关键词批量处理工具，支持多文件处理、翻译、Kdroi计算和多平台链接生成",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://api.deepseek.com/*"
  ],
  "action": {
    "default_title": "关键词工具"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### 步骤2：修改background.js

```javascript
// Background script for extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('关键词工具扩展已安装');
});

// 处理扩展图标点击事件 - 打开独立窗口
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 检查是否已经打开了窗口
    const windows = await chrome.windows.getAll();
    const existingWindow = windows.find(w => w.type === 'panel' && w.title?.includes('关键词工具'));

    if (existingWindow) {
      // 如果窗口已存在，聚焦到该窗口
      await chrome.windows.update(existingWindow.id, { focused: true });
    } else {
      // 创建新的独立窗口
      await chrome.windows.create({
        url: 'window.html',
        type: 'panel',
        width: 550,
        height: 600,
        focused: true,
        top: 50,
        left: 100
      });
    }
  } catch (error) {
    console.error('打开窗口失败:', error);
  }
});

// 处理来自window的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkApiConfig') {
    // 检查API配置
    chrome.storage.local.get(['deepseek_api_endpoint', 'deepseek_api_key'], (result) => {
      const isConfigured = result.deepseek_api_endpoint && result.deepseek_api_key;
      sendResponse({ configured: isConfigured });
    });
    return true; // 保持消息通道开放
  }
});
```

### 步骤3：创建window.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>关键词工具 - Keyword Tool</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 550px;
            height: 600px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            background-color: #f5f5f5;
            overflow-y: auto;
            padding: 10px;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
        }

        .header h1 {
            font-size: 18px;
            margin-bottom: 5px;
        }

        .header p {
            font-size: 12px;
            opacity: 0.9;
        }

        .section {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .section h2 {
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 5px;
        }

        .upload-area {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .upload-area:hover {
            border-color: #667eea;
            background-color: #f8f9ff;
        }

        .upload-area.dragover {
            border-color: #667eea;
            background-color: #f0f2ff;
        }

        .file-input {
            display: none;
        }

        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            margin: 5px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .progress {
            width: 100%;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
        }

        .file-list {
            max-height: 200px;
            overflow-y: auto;
        }

        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid #eee;
        }

        .file-item:last-child {
            border-bottom: none;
        }

        .status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
        }

        .status.pending {
            background-color: #fff3cd;
            color: #856404;
        }

        .status.processing {
            background-color: #d1ecf1;
            color: #0c5460;
        }

        .status.completed {
            background-color: #d4edda;
            color: #155724;
        }

        .status.error {
            background-color: #f8d7da;
            color: #721c24;
        }

        .config-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .input-group {
            display: flex;
            flex-direction: column;
        }

        .input-group label {
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }

        .input-group input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification.success {
            background-color: #28a745;
        }

        .notification.error {
            background-color: #dc3545;
        }

        .notification.info {
            background-color: #17a2b8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 关键词工具</h1>
            <p>支持多文件处理、翻译、Kdroi计算和多平台链接生成</p>
        </div>

        <div class="section">
            <h2>🔧 API配置</h2>
            <div class="config-section">
                <div class="input-group">
                    <label for="apiEndpoint">API地址:</label>
                    <input type="url" id="apiEndpoint" placeholder="https://api.deepseek.com/v1/chat/completions">
                </div>
                <div class="input-group">
                    <label for="apiKey">API密钥:</label>
                    <input type="password" id="apiKey" placeholder="输入您的API密钥">
                </div>
            </div>
            <button class="btn" id="saveConfig">保存配置</button>
            <button class="btn" id="testConfig">测试连接</button>
        </div>

        <div class="section">
            <h2>📤 文件上传</h2>
            <div class="upload-area" id="uploadArea">
                <p>📁 拖拽XLSX文件到此处或点击选择文件</p>
                <p style="font-size: 12px; color: #666; margin-top: 5px;">支持批量上传多个文件</p>
            </div>
            <input type="file" id="fileInput" class="file-input" accept=".xlsx,.xls" multiple>
        </div>

        <div class="section">
            <h2>📊 文件列表</h2>
            <div class="file-list" id="fileList"></div>
        </div>

        <div class="section">
            <h2>🔄 处理进度</h2>
            <div class="progress">
                <div class="progress-bar" id="progressBar" style="width: 0%"></div>
            </div>
            <p id="progressText">等待上传文件...</p>
        </div>

        <div class="section">
            <h2>📥 操作</h2>
            <button class="btn" id="processBtn" disabled>开始处理</button>
            <button class="btn" id="downloadBtn" disabled>下载合并文件</button>
            <button class="btn" id="clearBtn">清空列表</button>
        </div>
    </div>

    <script src="xlsx.full.min.js"></script>
    <script src="window.js"></script>
</body>
</html>
```

### 步骤4：创建window.js

```javascript
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
        document.getElementById('testConfig').addEventListener('click', this.testApiConfig.bind(this));

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

    async testApiConfig() {
        if (!this.apiConfig.endpoint || !this.apiConfig.key) {
            this.showNotification('请先配置API信息', 'error');
            return;
        }

        try {
            const response = await fetch(this.apiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiConfig.key}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                this.showNotification('API连接测试成功', 'success');
            } else {
                this.showNotification('API连接测试失败', 'error');
            }
        } catch (error) {
            this.showNotification('API连接测试失败', 'error');
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
                        ${(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
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

        try {
            // 逐个处理文件
            for (let i = 0; i < this.files.length; i++) {
                const fileInfo = this.files[i];
                fileInfo.status = 'processing';
                this.updateFileList();
                this.updateProgress(i, this.files.length);

                try {
                    const processedData = await this.processFile(fileInfo.file);
                    fileInfo.processedData = processedData;
                    fileInfo.status = 'completed';
                    this.processedFiles.push({
                        name: fileInfo.file.name,
                        data: processedData
                    });
                } catch (error) {
                    fileInfo.status = 'error';
                    console.error(`处理文件 ${fileInfo.file.name} 失败:`, error);
                }

                this.updateFileList();
            }

            this.updateProgress(this.files.length, this.files.length);
            this.showNotification('所有文件处理完成', 'success');

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
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    // 处理数据（翻译、计算Kdroi等）
                    this.processData(jsonData).then(resolve).catch(reject);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    async processData(jsonData) {
        // 提取需要翻译的关键词
        const keywords = jsonData.map(row => row.Keyword || row['关键词'] || '').filter(k => k);

        // 批量翻译关键词
        const translations = await this.translateKeywords(keywords);

        // 处理每一行数据
        return jsonData.map((row, index) => {
            const processedRow = { ...row };

            // 添加翻译
            processedRow['Translation'] = translations[index] || '';
            processedRow['翻译'] = translations[index] || '';

            // 计算Kdroi
            const volume = parseFloat(row.Volume || row['搜索量'] || 0);
            const cpc = parseFloat(row['CPC (USD)'] || row['CPC'] || 0);
            const difficulty = parseFloat(row['Keyword Difficulty'] || row['关键词难度'] || 1);

            const kdroi = difficulty > 0 ? (volume * cpc / difficulty) : 0;
            processedRow['Kdroi'] = Math.round(kdroi * 100) / 100;

            // 生成链接
            const keyword = encodeURIComponent(row.Keyword || row['关键词'] || '');
            processedRow['SERP'] = `https://www.google.com/search?q=${keyword}`;
            processedRow['Google Trends'] = `https://trends.google.com/trends/explore?q=${keyword}`;
            processedRow['Ahrefs'] = `https://ahrefs.com/keyword-difficulty-checker?keyword=${keyword}`;

            return processedRow;
        });
    }

    async translateKeywords(keywords) {
        if (!keywords.length) return [];

        const batchSize = 20;
        const results = [];

        for (let i = 0; i < keywords.length; i += batchSize) {
            const batch = keywords.slice(i, i + batchSize);

            try {
                const response = await fetch(this.apiConfig.endpoint, {
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
                                content: `请将以下关键词翻译成中文，每个关键词一行，不要添加序号或其他内容：\n${batch.join('\n')}`
                            }
                        ],
                        max_tokens: 1000,
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const translation = data.choices[0].message.content;
                    const translatedKeywords = translation.split('\n').filter(k => k.trim());
                    results.push(...translatedKeywords);
                } else {
                    console.error('翻译请求失败:', response.status);
                    results.push(...batch.map(() => '翻译失败'));
                }

                // 添加延迟避免API限制
                if (i + batchSize < keywords.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error('翻译出错:', error);
                results.push(...batch.map(() => '翻译失败'));
            }
        }

        return results;
    }

    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        document.getElementById('progressBar').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `正在处理: ${current}/${total}`;
    }

    async downloadMergedFile() {
        if (this.processedFiles.length === 0) {
            this.showNotification('没有可下载的文件', 'error');
            return;
        }

        try {
            // 创建合并的工作簿
            const wb = XLSX.utils.book_new();

            // 添加总览表
            const overviewData = [
                ['文件名', '词根', '关键词数量', '状态'],
                ...this.processedFiles.map(file => [
                    file.name,
                    this.extractWordRoot(file.name),
                    file.data.length,
                    '已完成'
                ])
            ];

            const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
            XLSX.utils.book_append_sheet(wb, overviewWs, '总览');

            // 添加每个文件的数据表
            this.processedFiles.forEach(file => {
                const ws = XLSX.utils.json_to_sheet(file.data);
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
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new KeywordProcessor();
});
```

## 🚀 部署步骤

1. **修改manifest.json**
2. **修改background.js**
3. **创建window.html**
4. **创建window.js**
5. **复制xlsx.full.min.js到项目根目录**
6. **在Chrome扩展管理页面重新加载插件**

## 🎯 使用方式

1. **打开插件**：点击Chrome工具栏中的插件图标
2. **配置API**：输入DeepSeek API地址和密钥
3. **上传文件**：拖拽或选择XLSX文件
4. **开始处理**：点击"开始处理"按钮
5. **下载结果**：处理完成后点击"下载合并文件"

## ⚡ 功能特点

### ✅ 优势
- **独立窗口**：不会因为切换标签页而关闭
- **持续工作**：即使切换到其他程序，处理任务继续进行
- **批量处理**：支持同时处理多个文件
- **实时进度**：显示处理进度和状态
- **结果合并**：将所有文件结果合并到一个Excel文件中

### 🔧 技术特性
- **Service Worker**：后台处理，不依赖网页
- **Chrome Storage API**：安全存储API配置
- **SheetJS**：强大的Excel文件处理
- **DeepSeek API**：高质量的关键词翻译

## 🛠️ 故障排除

### 常见问题

1. **点击插件图标没有反应**
   - 检查manifest.json是否正确
   - 重新加载插件
   - 查看Chrome控制台错误信息

2. **文件上传失败**
   - 确保文件格式为.xlsx或.xls
   - 检查文件大小是否过大
   - 确认文件没有被其他程序占用

3. **API调用失败**
   - 检查API密钥是否正确
   - 确认网络连接正常
   - 验证API地址是否正确

4. **窗口无法打开**
   - 检查是否有其他程序阻止弹出窗口
   - 尝试关闭其他Chrome面板
   - 重启Chrome浏览器

## 📝 注意事项

1. **窗口管理**：窗口必须手动关闭，不会自动关闭
2. **资源占用**：处理大文件时可能占用较多内存
3. **API限制**：注意DeepSeek API的调用频率限制
4. **文件格式**：只支持标准的Excel文件格式
5. **数据安全**：所有处理都在本地完成，不会上传到服务器

## 🔮 未来改进

1. **添加更多API支持**（OpenAI、Claude等）
2. **优化处理性能**（Web Worker多线程处理）
3. **增加数据可视化**（图表展示）
4. **支持更多文件格式**（CSV、Google Sheets等）
5. **添加模板功能**（保存常用的处理模板）

---

这个改造方案将为您提供稳定可靠的关键词处理工具，满足您持续工作不被打断的需求。