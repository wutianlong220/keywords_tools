# 关键词工具 - Chrome扩展版 (Keyword Tool)

一个强大的Chrome浏览器扩展关键词处理工具，专为SEO优化和关键词分析设计。支持XLSX文件批量处理，自动翻译、Kdroi计算和多个平台链接生成。

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

## 📦 扩展文件清单

- `manifest.json` - 扩展配置文件
- `popup.html` - 扩展弹出界面
- `popup.js` - 扩展主要逻辑
- `background.js` - 后台脚本
- `xlsx.full.min.js` - Excel处理库
- `icons/` - 扩展图标目录

## 🚀 安装方法

### 方法1：开发者模式安装（推荐）

1. **打开Chrome扩展管理页面**
   - 地址栏输入：`chrome://extensions/`
   - 或者：右上角三点菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 右上角打开"开发者模式"开关

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择包含这些文件的文件夹

4. **完成安装**
   - 扩展会出现在扩展列表和工具栏
   - 工具栏会出现新的扩展图标

### 方法2：打包安装

1. **在扩展管理页面**
   - 点击"打包扩展程序"
   - 选择扩展文件夹，生成.crx文件

2. **拖拽安装**
   - 将.crx文件拖拽到扩展页面

## 🔧 使用方法

### 1. 配置API
- 点击工具栏的扩展图标
- 输入你的API地址和密钥
- 点击"保存配置"

### 2. 处理文件
- 点击"选择文件"按钮或拖拽XLSX文件到上传区域
- 等待处理完成（实时显示进度）
- 下载处理后的文件

## 📁 输入文件格式

XLSX文件必须包含以下列：
- **Keyword**: 关键词
- **Intent**: 用户意图  
- **Volume**: 搜索量
- **Keyword Difficulty**: 关键词难度
- **CPC (USD)**: 每次点击费用

## 🔧 技术实现

### 技术栈
- **扩展平台**: Chrome Extension API
- **前端**: HTML5 + CSS3 + 原生JavaScript (ES6+)
- **文件处理**: SheetJS (XLSX库)
- **API集成**: DeepSeek Chat Completions API
- **存储**: Chrome Storage API

### 核心特性
- ✅ 无跨域限制，可直接调用任何AI API
- ✅ 本地存储，API密钥安全
- ✅ 支持大文件批量处理
- ✅ 实时进度显示和错误处理
- ✅ 支持停止处理
- ✅ 数字格式正确处理 (Kdroi列)
- ✅ 完全去中心化，无需服务器

## 🛡️ 安全特性

- **本地处理**: 所有数据处理都在本地完成，不会上传到服务器
- **API安全**: API密钥保存在Chrome本地存储，无泄露风险
- **文件安全**: 文件仅在本地处理，无网络传输
- **用户自付**: 每个人用自己的API密钥，费用自理

## ✅ 扩展优势

- **无跨域限制**: 可以直接调用任何AI API
- **本地存储**: API密钥保存在本地，安全
- **用户自付**: 每个人用自己的API密钥
- **完全去中心化**: 不需要服务器
- **即开即用**: 安装后即可使用，无需配置环境

## ⚠️ 注意事项

1. **浏览器支持**: 仅支持Chrome/Edge浏览器
2. **API配置**: 确保DeepSeek API密钥正确配置
3. **文件格式**: 仅支持XLSX格式文件
4. **网络要求**: 需要网络连接以调用翻译API
5. **处理时间**: 大量数据可能需要较长时间处理
6. **数字格式**: Kdroi列已优化为真正的数字格式，支持Excel计算

## 📊 示例

### 输入数据
| Keyword | Intent | Volume | Keyword Difficulty | CPC (USD) |
|---------|--------|--------|-------------------|-----------|
| best laptop | commercial | 10000 | 45 | 1.2 |

### 输出结果
| Keyword | Translation | Kdroi | SERP | Ahrefs Keyword Difficulty Checker |
|---------|-------------|-------|------|-----------------------------------|
| best laptop | 最佳笔记本 | 266.67 | [Google搜索](https://www.google.com/search?q=best%20laptop) | [Ahrefs查询](https://ahrefs.com/keyword-difficulty/?country=us&input=best%20laptop) |

## 🔧 故障排除

### 常见问题
1. **扩展无法加载**: 检查manifest.json文件格式是否正确
2. **API调用失败**: 检查API密钥是否正确，网络是否正常
3. **文件处理失败**: 确保XLSX文件格式正确，包含必需的列
4. **下载失败**: 检查浏览器下载设置，确保允许下载

### 调试方法
1. 打开扩展管理页面，点击"检查视图"查看控制台错误
2. 检查网络请求是否正常
3. 验证API密钥是否有效

## 📄 许可证

本项目仅供学习和个人使用。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个工具！