import { ScreenshotTool } from './components';
import { useState, useEffect } from 'react';

interface ActivateScreenshotEvent extends CustomEvent {
  detail: {
    action: string;
    [key: string]: unknown;
  };
}

export default function ContentApp() {
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    console.log('ContentApp mounted - setting up message listeners');

    // 监听来自popup或background的消息
    const messageListener = (
      message: { type: string; [key: string]: unknown },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: { [key: string]: unknown }) => void,
    ) => {
      console.log('Content UI received message:', message.type);

      // 处理ping消息，用于检查内容脚本是否已加载
      if (message.type === 'ping') {
        console.log('Received ping, sending pong');
        sendResponse({ pong: true });
        return true; // 保持消息通道开放
      }

      // 处理截图模式切换
      if (message.type === 'toggleScreenshotMode') {
        console.log('Activating screenshot mode via message');
        setIsScreenshotMode(true);
        sendResponse({ success: true });
        return true; // 保持消息通道开放
      }

      // 默认返回以保持通道开放
      return true;
    };

    // 确保添加消息监听器
    chrome.runtime.onMessage.addListener(messageListener);

    // 监听自定义事件来激活截图模式（用于绕过通信问题）
    const customEventListener = (event: Event) => {
      const customEvent = event as ActivateScreenshotEvent;
      console.log('Received custom event', customEvent.detail);
      if (customEvent.detail?.action === 'start') {
        console.log('Activating screenshot mode via custom event');
        setIsScreenshotMode(true);
      }
    };

    document.addEventListener('activate-screenshot', customEventListener);

    // 广播ready消息让popup知道我们已经准备好了
    try {
      chrome.runtime.sendMessage({
        type: 'contentScriptReady',
        from: 'content-ui',
      });
      console.log('Sent contentScriptReady message');
    } catch (error) {
      console.error('Failed to send ready message:', error);
    }

    return () => {
      console.log('ContentApp unmounting - removing message listeners');
      chrome.runtime.onMessage.removeListener(messageListener);
      document.removeEventListener('activate-screenshot', customEventListener);
    };
  }, []);

  const handleCapture = (imageData: string) => {
    console.log('Screenshot captured');
    setCapturedImage(imageData);
    setIsScreenshotMode(false);

    // 发送截图数据到background保存
    chrome.runtime.sendMessage({
      type: 'saveScreenshot',
      imageData,
    });
  };

  const handleClose = () => {
    console.log('Screenshot mode closed');
    setIsScreenshotMode(false);
  };

  return (
    <div id="content-ui-app">
      {isScreenshotMode && <ScreenshotTool onCapture={handleCapture} onClose={handleClose} />}
    </div>
  );
}
