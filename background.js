// Background script for extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('关键词工具扩展已安装');
});

// 处理来自popup的消息
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