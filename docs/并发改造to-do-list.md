# 关键词工具并发改造 To-Do List

## 总体目标
根据 `docs/插件并发改造.md` 方案，实现固定并发数 + 索引映射的并发翻译功能，提升关键词处理性能。

---

## 第一阶段：准备工作

### 1.1 代码备份和分支管理
- [ ] 创建当前代码备份
- [ ] 确认当前功能正常工作
- [ ] 记录现有代码的关键参数（当前批次大小、翻译逻辑等）

### 1.3 参数定义
- [ ] 定义核心常量：
  ```javascript
  const BATCH_SIZE = 80;        // 每批关键词数量
  const CONCURRENCY_LIMIT = 5;  // 并发数量
  const REQUEST_TIMEOUT = 30000; // 请求超时时间
  const MAX_RETRIES = 2;       // 最大重试次数
  ```

---

## 第二阶段：核心翻译逻辑改造

### 2.1 修改 batchTranslateKeywords 方法
- [ ] 重构 `batchTranslateKeywords` 方法，支持并发处理
- [ ] 实现固定并发数控制逻辑
- [ ] 添加进度跟踪和日志记录
- [ ] 实现索引映射机制

**具体实现要求：**
```javascript
// 新的方法签名
async batchTranslateKeywords(keywords, totalRows) {
    // 并发处理逻辑
}
```

### 2.2 创建 translateBatchWithIndex 方法
- [ ] 新增 `translateBatchWithIndex` 方法
- [ ] 实现带索引的翻译请求发送
- [ ] 实现带索引的响应解析
- [ ] 添加错误处理和重试机制

**具体实现要求：**
```javascript
// 新方法
async translateBatchWithIndex(keywords, startIndex) {
    // 返回格式：{startIndex: number, translations: array}
}
```

### 2.3 修改现有 translateBatch 方法
- [ ] 重构现有的 `translateBatch` 方法
- [ ] 优化提示词格式
- [ ] 改进响应解析逻辑
- [ ] 增强错误处理

---

## 第三阶段：进度显示和用户体验

### 3.1 改进进度更新机制
- [ ] 修改 `updateProgress` 方法，支持并发进度显示
- [ ] 添加更详细的进度信息（当前批次/总批次，并发状态等）
- [ ] 实现平滑的进度条更新

### 3.2 增强状态反馈
- [ ] 添加并发状态指示器
- [ ] 显示当前并发数和活跃请求数

### 3.3 错误处理优化
- [ ] 实现批次级别的错误隔离
- [ ] 添加友好的错误提示信息
- [ ] 实现自动重试机制
- [ ] 记录详细的错误日志


---

## 具体实现检查清单

### popup.js 文件修改
- [ ] 修改 `batchTranslateKeywords` 方法（270行左右）
- [ ] 新增 `translateBatchWithIndex` 方法
- [ ] 修改 `translateBatch` 方法（344行左右）
- [ ] 修改 `updateProgress` 方法（595行左右）
- [ ] 添加新的常量定义
- [ ] 添加错误处理逻辑
- [ ] 优化进度显示

### 关键代码位置
- **batchTranslateKeywords**: 约第270行
- **translateBatch**: 约第344行
- **updateProgress**: 约第595行
- **常量定义**: 建议放在文件顶部

---

## 备注

- 优先保证功能稳定性，其次考虑性能优化
- 保持代码简洁，避免过度复杂化
- 充分测试，确保不影响现有功能
- 做好版本控制，便于回滚