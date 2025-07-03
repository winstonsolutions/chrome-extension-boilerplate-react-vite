import 'webextension-polyfill';
import { colorfulLog } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('Current theme:', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// 记录扩展启动
colorfulLog('🚀 Background script initialized!', 'success');

// 管理内容脚本状态
const contentScriptStatus = {
  initialized: new Map<number, boolean>(),
};

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, sender.tab?.id);

  // 跟踪内容脚本是否已初始化
  if (message.type === 'contentScriptReady' && sender.tab?.id) {
    contentScriptStatus.initialized.set(sender.tab.id, true);
    console.log(`Content script ready in tab ${sender.tab.id}`);
    return true;
  }

  if (message.type === 'captureVisibleTab') {
    console.log('Capturing visible tab');
    chrome.tabs.captureVisibleTab({ format: 'png' }, dataUrl => {
      if (chrome.runtime.lastError) {
        console.error('Error capturing tab:', chrome.runtime.lastError);
        sendResponse(null);
      } else {
        sendResponse(dataUrl);
      }
    });
    return true; // 表示我们会异步发送响应
  }

  // 处理保存截图
  if (message.type === 'saveScreenshot') {
    const { imageData } = message;
    console.log('Saving screenshot');

    // 获取当前日期和时间作为文件名
    const date = new Date();
    const fileName = `screenshot_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date
      .getDate()
      .toString()
      .padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}.png`;

    // 下载图片
    chrome.downloads.download({
      url: imageData,
      filename: fileName,
      saveAs: true,
    });

    return true;
  }

  // 检查内容脚本状态
  if (message.type === 'checkContentScriptStatus' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const isInitialized = contentScriptStatus.initialized.get(tabId) === true;
    sendResponse({ initialized: isInitialized });
    return true;
  }

  return true;
});

// 标签关闭时清理状态
chrome.tabs.onRemoved.addListener(tabId => {
  contentScriptStatus.initialized.delete(tabId);
});
