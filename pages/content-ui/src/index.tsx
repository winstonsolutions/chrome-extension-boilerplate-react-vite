import ContentApp from '@src/app/ContentApp';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@src/index.css';

console.log('Content UI script loaded');

// 全局标记，表示脚本已加载
window.__SCREENSHOT_TOOL_LOADED__ = true;

const renderApp = () => {
  const appContainer = document.createElement('div');
  appContainer.id = 'content-ui-root';
  document.body.appendChild(appContainer);

  const root = createRoot(appContainer);
  root.render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>,
  );
};

// 确保DOM已加载后再渲染
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

// 添加全局类型
declare global {
  interface Window {
    __SCREENSHOT_TOOL_LOADED__?: boolean;
  }
}
