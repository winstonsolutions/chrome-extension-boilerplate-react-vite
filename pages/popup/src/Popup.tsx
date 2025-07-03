import '@src/Popup.css';
import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useState } from 'react';

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // 添加日志
  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };

  // 直接注入简化版的截图工具
  const injectSimpleScreenshotTool = async (tabId: number) => {
    try {
      addLog('准备注入截图工具...');

      // 先尝试直接注入脚本字符串
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // 在这里添加一个全局标记，表示代码被执行了
          window._SCREENSHOT_INJECTION_STARTED = true;
          console.log('注入函数开始执行');
        },
      });

      addLog('注入初始化成功');

      // 注入主要的截图代码
      await chrome.scripting
        .executeScript({
          target: { tabId },
          func: function () {
            try {
              console.log('开始执行截图工具代码');
              window._SCREENSHOT_CODE_RUNNING = true;

              // 直接执行代码，而不是使用 new Function
              // 创建截图框和控制面板
              const frameDiv = document.createElement('div');
              frameDiv.style.cssText =
                'position:fixed;width:500px;height:400px;border:2px dashed red;background:rgba(0,0,0,0.1);z-index:9999999;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;';
              document.body.appendChild(frameDiv);

              const controlsDiv = document.createElement('div');
              controlsDiv.style.cssText =
                'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:white;padding:10px;border-radius:5px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:10000000;display:flex;gap:10px;align-items:center;';

              // 添加宽度控制
              const widthLabel = document.createElement('label');
              widthLabel.textContent = '宽度: ';
              const widthInput = document.createElement('input');
              widthInput.type = 'number';
              widthInput.value = '500';
              widthInput.min = '10';
              widthInput.style.cssText = 'width:70px;margin:0 10px;';
              widthLabel.appendChild(widthInput);

              // 添加高度控制
              const heightLabel = document.createElement('label');
              heightLabel.textContent = '高度: ';
              const heightInput = document.createElement('input');
              heightInput.type = 'number';
              heightInput.value = '400';
              heightInput.min = '10';
              heightInput.style.cssText = 'width:70px;margin:0 10px;';
              heightLabel.appendChild(heightInput);

              // 添加按钮
              const captureBtn = document.createElement('button');
              captureBtn.textContent = '截图';
              captureBtn.style.cssText =
                'background:#4CAF50;color:white;border:none;padding:5px 10px;border-radius:3px;cursor:pointer;';

              const cancelBtn = document.createElement('button');
              cancelBtn.textContent = '取消';
              cancelBtn.style.cssText =
                'background:#f44336;color:white;border:none;padding:5px 10px;border-radius:3px;cursor:pointer;';

              // 更新尺寸事件
              widthInput.onchange = function () {
                const newWidth = parseInt((this as HTMLInputElement).value);
                if (!isNaN(newWidth) && newWidth > 0) {
                  frameDiv.style.width = newWidth + 'px';
                }
              };

              heightInput.onchange = function () {
                const newHeight = parseInt((this as HTMLInputElement).value);
                if (!isNaN(newHeight) && newHeight > 0) {
                  frameDiv.style.height = newHeight + 'px';
                }
              };

              // 截图功能
              captureBtn.onclick = function () {
                // 隐藏控制界面
                controlsDiv.style.display = 'none';
                frameDiv.style.border = 'none';
                frameDiv.style.background = 'transparent';

                // 等待UI更新
                setTimeout(function () {
                  // 截图
                  chrome.runtime.sendMessage({ type: 'captureVisibleTab' }, function (dataUrl) {
                    if (!dataUrl) {
                      alert('截图失败，请重试');
                      controlsDiv.style.display = 'flex';
                      frameDiv.style.border = '2px dashed red';
                      frameDiv.style.background = 'rgba(0,0,0,0.1)';
                      return;
                    }

                    // 创建一个图片对象
                    const img = new Image();
                    img.onload = function () {
                      const canvas = document.createElement('canvas');
                      const rect = frameDiv.getBoundingClientRect();
                      canvas.width = rect.width;
                      canvas.height = rect.height;

                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);

                        // 转换为数据URL
                        const croppedDataUrl = canvas.toDataURL('image/png');

                        // 发送到后台保存
                        chrome.runtime.sendMessage({
                          type: 'saveScreenshot',
                          imageData: croppedDataUrl,
                        });
                      } else {
                        console.error('无法获取Canvas上下文');
                      }

                      // 清理UI
                      document.body.removeChild(frameDiv);
                      document.body.removeChild(controlsDiv);
                    };

                    img.src = dataUrl;
                  });
                }, 100);
              };

              // 取消功能
              cancelBtn.onclick = function () {
                document.body.removeChild(frameDiv);
                document.body.removeChild(controlsDiv);
              };

              // 组装UI元素
              controlsDiv.appendChild(widthLabel);
              controlsDiv.appendChild(heightLabel);
              controlsDiv.appendChild(captureBtn);
              controlsDiv.appendChild(cancelBtn);
              document.body.appendChild(controlsDiv);

              console.log('截图工具代码执行完成');
              window._SCREENSHOT_CODE_COMPLETED = true;
              return { success: true };
            } catch (err: unknown) {
              console.error('执行截图代码出错:', err);
              const errorMessage = err instanceof Error ? err.message : '未知错误';
              return {
                success: false,
                error: errorMessage,
              };
            }
          },
        })
        .then(results => {
          const result = results[0]?.result;
          if (result?.success) {
            addLog('截图工具注入成功');
          } else {
            addLog(`截图工具注入失败: ${result?.error || '未知错误'}`);
            setErrorMessage(`截图工具注入失败: ${result?.error || '未知错误'}`);
          }
        })
        .catch(err => {
          addLog(`注入脚本出错: ${err.message}`);
          setErrorMessage(`注入脚本出错: ${err.message}`);
        });

      // 检查注入是否成功
      setTimeout(async () => {
        try {
          const checkResults = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => ({
              started: window._SCREENSHOT_INJECTION_STARTED === true,
              running: window._SCREENSHOT_CODE_RUNNING === true,
              completed: window._SCREENSHOT_CODE_COMPLETED === true,
            }),
          });

          const status = checkResults[0]?.result;
          addLog(`截图状态检查: ${JSON.stringify(status)}`);

          // 关闭弹出窗口
          window.close();
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : '未知错误';
          addLog(`状态检查失败: ${errorMessage}`);
        }
      }, 1000);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      addLog(`注入截图工具失败: ${errorMsg}`);
      setErrorMessage(`注入失败: ${errorMsg}`);
      setIsLoading(false);
    }
  };

  // 直接在当前标签页中执行截图
  const handleDirectScreenshot = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setLogs([]);
    addLog('开始执行截图...');

    try {
      // 获取当前标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('没有找到活动标签页');
      }

      const tabId = tabs[0].id;
      const url = tabs[0].url || '';

      addLog(`当前标签页: ${url}`);

      // 检查是否是特殊页面
      if (
        url.startsWith('chrome://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('devtools://')
      ) {
        throw new Error('无法在浏览器内部页面上使用此功能');
      }

      // 注入并执行简化版的截图工具
      await injectSimpleScreenshotTool(tabId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      addLog(`截图失败: ${errorMsg}`);
      setErrorMessage(`截图失败: ${errorMsg}`);
      setIsLoading(false);
    }
  };

  // 创建一个普通网页标签并在那里激活截图
  const openNewTabWithScreenshot = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setLogs([]);
    addLog('准备在新标签页中截图...');

    try {
      // 创建一个新标签页，并导航到百度
      const newTab = await chrome.tabs.create({ url: 'https://www.baidu.com' });
      const newTabId = newTab.id;

      if (!newTabId) {
        throw new Error('无法获取新标签页ID');
      }

      addLog(`新标签页创建成功，ID: ${newTabId}`);

      // 设置监听页面加载完成的事件
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTabId && changeInfo.status === 'complete') {
          addLog('新标签页加载完成，移除监听器');
          // 移除监听器避免重复调用
          chrome.tabs.onUpdated.removeListener(listener);

          // 给页面一些额外的时间完全加载DOM
          setTimeout(() => {
            injectSimpleScreenshotTool(tabId);
          }, 1000);
        }
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      addLog(`打开新标签页失败: ${errorMsg}`);
      setErrorMessage(`打开新标签页失败: ${errorMsg || '未知错误'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <button
          className={cn(
            'screenshot-button mb-4 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700',
            isLoading && 'cursor-not-allowed opacity-50',
          )}
          onClick={handleDirectScreenshot}
          disabled={isLoading}>
          {isLoading ? '正在加载...' : '开始截图 (推荐)'}
        </button>

        <button
          className={cn(
            'mb-4 rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700',
            isLoading && 'cursor-not-allowed opacity-50',
          )}
          onClick={openNewTabWithScreenshot}
          disabled={isLoading}>
          在新标签页中截图
        </button>

        {errorMessage && (
          <div className="error-message mb-4 max-w-[250px] rounded-md bg-red-100 p-3 text-sm text-red-700">
            {errorMessage}
            {errorMessage.includes('浏览器内部页面') && <p className="mt-2 text-xs">请点击"在新标签页中截图"按钮</p>}
          </div>
        )}

        {logs.length > 0 && (
          <div className="logs mb-4 max-h-[100px] max-w-[250px] overflow-y-auto rounded-md bg-gray-100 p-3 text-xs text-gray-700">
            <p className="mb-1 font-bold">日志:</p>
            {logs.map((log, index) => (
              <div key={index} className="log-item">
                {log}
              </div>
            ))}
          </div>
        )}

        <ToggleButton onClick={exampleThemeStorage.toggle} className="mt-4">
          {t('toggleTheme')}
        </ToggleButton>
      </header>
    </div>
  );
};

// 添加全局类型声明
declare global {
  interface Window {
    _SCREENSHOT_INJECTION_STARTED?: boolean;
    _SCREENSHOT_CODE_RUNNING?: boolean;
    _SCREENSHOT_CODE_COMPLETED?: boolean;
  }
}

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
