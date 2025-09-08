# 关键词工具

这是一个网页工具，用于处理关键词数据XLSX文件，添加翻译、计算Kdroi值、生成搜索链接等功能。

## 功能特性

1. **翻译功能**：在Keyword列和Volume列之间插入Translation列，使用DeepSeek API将关键词翻译成中文
2. **Kdroi计算**：在CPC列右侧插入Kdroi列，计算公式：Volume × CPC ÷ Keyword Difficulty，保留2位小数
3. **SERP链接**：在Kdroi列右侧插入SERP列，包含Google搜索链接
4. **Google Trends链接**：在SERP列右侧插入Google Trends列，包含Google Trends搜索链接
5. **Ahrefs Keyword Difficulty Checker**：在Google Trends列右侧插入Ahrefs链接，直接查询关键词难度
6. **批量处理**：支持拖拽上传XLSX文件，批量处理所有关键词

## 使用方法

1. 配置API密钥：
   - 编辑 `config.json` 文件，填入你的DeepSeek API endpoint和密钥
   - 或者编辑 `.env` 文件设置环境变量

2. 启动工具：
   - 由于是纯前端工具，只需要用浏览器打开 `index.html` 文件即可

3. 处理文件：
   - 点击"选择文件"按钮或直接拖拽XLSX文件到上传区域
   - 等待处理完成
   - 点击"下载处理后的文件"按钮获取结果

## 配置说明

### config.json
```json
{
  "apiEndpoint": "https://api.deepseek.com/v1/chat/completions",
  "apiKey": "your-api-key-here"
}
```

### .env
```
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_API_KEY=your-api-key-here
```

## 输入文件格式

XLSX文件应包含以下列：
- Keyword：关键词
- Intent：用户意图
- Volume：搜索量
- Keyword Difficulty：关键词难度
- CPC (USD)：每次点击费用

## 输出文件格式

处理后的XLSX文件将包含以下列：
- Keyword：原始关键词
- Translation：中文翻译
- Intent：用户意图（保持原样）
- Volume：搜索量
- Keyword Difficulty：关键词难度
- CPC (USD)：每次点击费用
- Kdroi：计算值 (Volume × CPC ÷ Keyword Difficulty)
- SERP：Google搜索链接
- Google Trends：Google Trends链接
- Ahrefs Keyword Difficulty Checker：Ahrefs关键词难度查询链接

## 注意事项

1. 确保API密钥正确配置
2. 处理大量数据时可能需要较长时间
3. 生成的链接可以直接点击打开对应的搜索页面
4. 工具完全在本地运行，不会上传数据到服务器（除了API调用）
5. 支持XLSX格式，保持更好的格式兼容性

## 技术实现

- 纯前端实现，使用HTML、CSS、JavaScript
- 使用FileReader API读取XLSX文件
- 使用fetch API调用DeepSeek API
- 支持拖拽上传和进度显示
- 使用SheetJS库处理Excel文件
- 响应式设计，适配不同屏幕尺寸