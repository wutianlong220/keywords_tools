# 关键词工具 (Keyword Tool)

一个强大的网页端关键词处理工具，专为SEO优化和关键词分析设计。支持XLSX文件批量处理，自动翻译、Kdroi计算和多个平台链接生成。

## 🚀 功能特性

### 核心功能
- **📝 批量处理**: 支持拖拽上传XLSX文件，一键批量处理所有关键词
- **🌐 智能翻译**: 使用DeepSeek API自动将关键词翻译成中文
- **📊 Kdroi计算**: 自动计算关键词的投资回报率 (Volume × CPC ÷ Keyword Difficulty)
- **🔗 多平台链接**: 一键生成Google搜索、Google Trends和Ahrefs查询链接

### 输出列说明
处理后的XLSX文件包含以下列：

| 列名 | 说明 |
|------|------|
| Keyword | 原始关键词 |
| Translation | 中文翻译 (DeepSeek API) |
| Intent | 用户意图 (保持原样) |
| Volume | 搜索量 |
| Keyword Difficulty | 关键词难度 |
| CPC (USD) | 每次点击费用 |
| **Kdroi** | **投资回报率 (数字格式，保留2位小数)** |
| SERP | Google搜索链接 |
| Google Trends | Google Trends趋势链接 |
| Ahrefs Keyword Difficulty Checker | Ahrefs难度查询链接 |

## 📋 使用方法

### 1. 配置API密钥
编辑 `config.json` 文件，填入你的DeepSeek API配置：

```json
{
  "apiEndpoint": "https://api.deepseek.com/v1/chat/completions",
  "apiKey": "your-api-key-here"
}
```

### 2. 启动工具
用浏览器打开 `index.html` 文件即可（纯前端应用，无需服务器）

### 3. 处理文件
- 点击"选择文件"按钮或直接拖拽XLSX文件到上传区域
- 等待处理完成（实时显示进度）
- 点击"下载处理后的文件"获取结果

## 📁 输入文件格式

XLSX文件必须包含以下列：
- **Keyword**: 关键词
- **Intent**: 用户意图  
- **Volume**: 搜索量
- **Keyword Difficulty**: 关键词难度
- **CPC (USD)**: 每次点击费用

## 🔧 技术实现

### 技术栈
- **前端**: HTML5 + CSS3 + 原生JavaScript (ES6+)
- **文件处理**: SheetJS (XLSX库)
- **API集成**: DeepSeek Chat Completions API
- **文件访问**: File System Access API

### 核心特性
- ✅ 纯前端运行，数据安全
- ✅ 支持大文件批量处理
- ✅ 实时进度显示和错误处理
- ✅ 支持停止处理
- ✅ 数字格式正确处理 (Kdroi列)
- ✅ 响应式设计，支持移动端

## 🛡️ 安全特性

- **本地处理**: 所有数据处理都在本地完成，不会上传到服务器
- **API安全**: 仅调用必要的翻译API，无其他数据传输
- **文件安全**: 使用现代File System Access API，文件访问权限受控

## ⚠️ 注意事项

1. **API配置**: 确保DeepSeek API密钥正确配置
2. **文件格式**: 仅支持XLSX格式文件
3. **网络要求**: 需要网络连接以调用翻译API
4. **处理时间**: 大量数据可能需要较长时间处理
5. **数字格式**: Kdroi列已优化为真正的数字格式，支持Excel计算

## 🚨 安全提醒

**重要**: `.env` 文件包含敏感API密钥信息，请勿上传到GitHub或其他公共代码仓库！

建议在 `.gitignore` 文件中添加：
```
.env
*.env
```

## 📊 示例

### 输入数据
| Keyword | Intent | Volume | Keyword Difficulty | CPC (USD) |
|---------|--------|--------|-------------------|-----------|
| best laptop | commercial | 10000 | 45 | 1.2 |

### 输出结果
| Keyword | Translation | Kdroi | SERP | Ahrefs Keyword Difficulty Checker |
|---------|-------------|-------|------|-----------------------------------|
| best laptop | 最佳笔记本 | 266.67 | [Google搜索](https://www.google.com/search?q=best%20laptop) | [Ahrefs查询](https://ahrefs.com/keyword-difficulty/?country=us&input=best%20laptop) |

## 📄 许可证

本项目仅供学习和个人使用。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个工具！