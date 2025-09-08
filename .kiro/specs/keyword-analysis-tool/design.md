# 设计文档

## 概述

关键词分析工具是一个单页面网页应用，使用纯HTML、CSS和JavaScript构建。用户上传CSV文件后，工具会自动添加翻译列、计算Kdroi指标，并生成Google搜索和趋势链接，最终提供增强后的CSV文件下载。

## 架构

### 整体架构
```
前端界面 (HTML/CSS/JS)
    ↓
文件处理模块 (JavaScript)
    ↓
DeepSeek API调用模块
    ↓
数据增强处理模块
    ↓
CSV生成和下载模块
```

### 技术栈
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **文件处理**: FileReader API, Papa Parse (CSV解析库)
- **API调用**: Fetch API
- **下载功能**: Blob API, URL.createObjectURL

## 组件和接口

### 1. 用户界面组件

#### 主界面布局
- **标题区域**: 工具名称和简介
- **配置区域**: API密钥输入框
- **上传区域**: 文件选择和拖拽上传
- **处理状态区域**: 进度显示和状态信息
- **下载区域**: 处理完成后的下载按钮

#### 界面元素（中文）
```html
- 标题: "关键词分析工具"
- API配置: "DeepSeek API密钥"
- 上传按钮: "选择CSV文件" / "拖拽文件到此处"
- 处理状态: "正在处理..." / "翻译中..." / "计算中..."
- 下载按钮: "下载处理后的文件"
- 错误提示: "文件格式错误" / "API密钥无效"
```

### 2. 文件处理模块

#### CSV解析器
```javascript
class CSVProcessor {
    validateFormat(data) {
        // 验证必需列: Keyword, Volume, Keyword Difficulty, CPC (USD)
    }
    
    parseCSV(file) {
        // 使用Papa Parse解析CSV
    }
    
    generateCSV(processedData) {
        // 生成增强后的CSV
    }
}
```

#### 数据验证规则
- 必须包含4个基础列
- Volume必须为数字
- Keyword Difficulty必须为数字
- CPC (USD)必须为数字
- Keyword不能为空

### 3. DeepSeek API集成模块

#### API调用接口
```javascript
class DeepSeekTranslator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.deepseek.com/v1/chat/completions';
    }
    
    async translateKeyword(keyword) {
        // 调用DeepSeek API进行翻译
        // 返回中文翻译结果
    }
    
    async batchTranslate(keywords) {
        // 批量翻译，控制并发数量
    }
}
```

#### API请求格式
```json
{
    "model": "deepseek-chat",
    "messages": [
        {
            "role": "system",
            "content": "你是一个专业的翻译助手，请将用户提供的关键词翻译成中文。如果已经是中文，请保持原文。只返回翻译结果，不要添加其他内容。"
        },
        {
            "role": "user",
            "content": "keyword to translate"
        }
    ],
    "temperature": 0.1
}
```

### 4. 数据增强处理模块

#### 数据处理流程
```javascript
class DataEnhancer {
    async processData(csvData, translator) {
        // 1. 添加Translation列
        // 2. 计算Kdroi列
        // 3. 生成SERP链接列
        // 4. 生成Google Trends链接列
    }
    
    calculateKdroi(volume, cpc, difficulty) {
        // 公式: (Volume × CPC) ÷ Keyword Difficulty
        // 保留2位小数
    }
    
    generateSERPLink(keyword) {
        // 生成Google搜索链接
    }
    
    generateTrendsLink(keyword) {
        // 生成Google Trends链接
    }
}
```

#### 列顺序和内容
1. **Keyword** (原始)
2. **Translation** (新增) - DeepSeek翻译结果
3. **Volume** (原始)
4. **Keyword Difficulty** (原始)
5. **CPC (USD)** (原始)
6. **Kdroi** (新增) - 计算值，保留2位小数
7. **SERP** (新增) - Google搜索链接
8. **Google Trends** (新增) - Google趋势链接

## 数据模型

### 输入数据结构
```javascript
{
    "Keyword": "string",
    "Volume": "number",
    "Keyword Difficulty": "number", 
    "CPC (USD)": "number"
}
```

### 输出数据结构
```javascript
{
    "Keyword": "string",
    "Translation": "string",
    "Volume": "number",
    "Keyword Difficulty": "number",
    "CPC (USD)": "number",
    "Kdroi": "number (2 decimal places)",
    "SERP": "string (URL)",
    "Google Trends": "string (URL)"
}
```

### URL生成规则
```javascript
// SERP链接
const serpUrl = `https://www.google.com/ncr?q=${encodeURIComponent(keyword)}`;

// Google Trends链接  
const trendsUrl = `https://trends.google.com/trends/explore?hl=zh-CN&q=${encodeURIComponent(keyword)}`;
```

## 错误处理

### 错误类型和处理策略

#### 1. 文件格式错误
- **检测**: 缺少必需列或数据类型错误
- **处理**: 显示中文错误信息，阻止处理
- **用户反馈**: "文件格式不正确，请确保包含Keyword、Volume、Keyword Difficulty、CPC (USD)列"

#### 2. API调用错误
- **检测**: 网络错误、API密钥无效、配额超限
- **处理**: 标记翻译失败，继续处理其他数据
- **用户反馈**: "翻译服务暂时不可用，部分关键词未翻译"

#### 3. 数据计算错误
- **检测**: 除零错误、无效数值
- **处理**: 对应行显示"N/A"
- **用户反馈**: 在状态栏显示处理异常的行数

#### 4. 下载错误
- **检测**: 浏览器兼容性问题
- **处理**: 提供备用下载方式
- **用户反馈**: "下载失败，请尝试使用其他浏览器"

### 错误恢复机制
- **翻译失败**: 继续处理其他列，标记失败项
- **部分数据错误**: 跳过错误行，处理有效数据
- **API限流**: 实现重试机制和延迟处理

## 测试策略

### 单元测试
1. **CSV解析测试**
   - 正确格式文件解析
   - 错误格式文件处理
   - 空文件处理

2. **数据计算测试**
   - Kdroi计算准确性
   - 边界值处理（零值、负值）
   - 数值精度测试

3. **URL生成测试**
   - 特殊字符编码
   - 中文关键词处理
   - 空值处理

### 集成测试
1. **API集成测试**
   - 有效API密钥调用
   - 无效API密钥处理
   - 网络异常处理

2. **端到端测试**
   - 完整文件处理流程
   - 下载功能验证
   - 用户界面交互

### 性能测试
1. **大文件处理**
   - 1000行数据处理时间
   - 内存使用情况
   - 浏览器响应性

2. **API调用优化**
   - 并发请求控制
   - 请求频率限制
   - 超时处理

## 安全考虑

### API密钥安全
- **存储**: 仅在浏览器会话中存储，不持久化
- **传输**: 仅用于HTTPS API调用
- **显示**: 输入框使用password类型遮蔽

### 数据隐私
- **本地处理**: 所有文件处理在客户端完成
- **无服务器存储**: 不上传用户数据到服务器
- **临时数据**: 页面刷新后清除所有数据

### 输入验证
- **文件类型**: 限制为.csv文件
- **文件大小**: 限制最大文件大小（如10MB）
- **数据清理**: 防止XSS攻击的数据清理

## 部署方案

### 本地部署
- **文件结构**: 单个HTML文件包含所有资源
- **依赖管理**: 使用CDN引入Papa Parse库
- **运行方式**: 直接在浏览器中打开HTML文件

### 未来服务器部署考虑
- **静态托管**: 可部署到GitHub Pages、Netlify等
- **API代理**: 考虑后端代理API调用以保护密钥
- **缓存策略**: 实现翻译结果缓存减少API调用