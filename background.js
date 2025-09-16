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
        width: 700,
        height: 900,
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