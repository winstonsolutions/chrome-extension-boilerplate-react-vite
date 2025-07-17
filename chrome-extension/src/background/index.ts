import 'webextension-polyfill';
import { colorfulLog } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { jsPDF } from 'jspdf';
// 引入补丁文件，确保PDFObject在全局环境中可用
import '../patches/jspdf-patch';

// User status interface
interface UserStatus {
  isLoggedIn: boolean;
  isPro: boolean;
  isInTrial: boolean;
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Open a welcome tab
    chrome.tabs.create({
      url: 'https://pixelcapture.winstontech.me/',
      active: true,
    });
    colorfulLog('🎉 Extension installed! Welcome page opened.', 'success');
  }
});

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

// 直接注入简化版的截图工具
let injectSimpleScreenshotTool = async (tabId: number) => {
  try {
    console.log('准备注入截图工具...');

    // 先尝试直接注入脚本字符串
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 在这里添加一个全局标记，表示代码被执行了
        window._SCREENSHOT_INJECTION_STARTED = true;
        console.log('注入函数开始执行');
      },
    });

    console.log('注入初始化成功');

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
              'position:fixed;width:500px;height:400px;border:2px dashed red;background:rgba(0,0,0,0.1);z-index:9999999;top:50%;left:50%;transform:translate(-50%,-50%);cursor:move;';
            document.body.appendChild(frameDiv);

            // 添加拖动把手（8个方向）
            const handles = [
              { position: 'top-left', cursor: 'nwse-resize', style: 'top:-5px;left:-5px;' },
              { position: 'top', cursor: 'ns-resize', style: 'top:-5px;left:50%;transform:translateX(-50%);' },
              { position: 'top-right', cursor: 'nesw-resize', style: 'top:-5px;right:-5px;' },
              { position: 'right', cursor: 'ew-resize', style: 'top:50%;right:-5px;transform:translateY(-50%);' },
              { position: 'bottom-right', cursor: 'nwse-resize', style: 'bottom:-5px;right:-5px;' },
              { position: 'bottom', cursor: 'ns-resize', style: 'bottom:-5px;left:50%;transform:translateX(-50%);' },
              { position: 'bottom-left', cursor: 'nesw-resize', style: 'bottom:-5px;left:-5px;' },
              { position: 'left', cursor: 'ew-resize', style: 'top:50%;left:-5px;transform:translateY(-50%);' },
            ];

            const handleElements = handles.map(handle => {
              const elem = document.createElement('div');
              elem.style.cssText = `position:absolute;width:10px;height:10px;background:white;border:1px solid red;border-radius:50%;cursor:${handle.cursor};z-index:10000000;${handle.style}`;
              elem.dataset.position = handle.position;
              frameDiv.appendChild(elem);
              return elem;
            });

            const controlsDiv = document.createElement('div');
            controlsDiv.style.cssText =
              'position:fixed !important;bottom:20px !important;left:50% !important;transform:translateX(-50%) !important;background:white !important;padding:8px !important;border-radius:5px !important;box-shadow:0 2px 10px rgba(0,0,0,0.2) !important;z-index:10000000 !important;display:flex !important;gap:5px !important;align-items:center !important;font-family:Arial,sans-serif !important;font-size:14px !important;line-height:normal !important;box-sizing:border-box !important;';

            // 添加宽度控制
            const widthLabel = document.createElement('label');
            widthLabel.textContent = 'Width: ';
            widthLabel.style.cssText =
              'font-family:Arial,sans-serif !important;font-size:14px !important;margin-right:0 !important;font-weight:normal !important;color:black !important;display:flex !important;align-items:center !important;white-space:nowrap !important;';
            const widthInput = document.createElement('input');
            widthInput.type = 'number';
            widthInput.value = '500';
            widthInput.min = '10';
            widthInput.style.cssText =
              'width:60px !important;height:28px !important;margin:0 5px !important;font-family:Arial,sans-serif !important;font-size:14px !important;padding:0 2px !important;box-sizing:border-box !important;border:1px solid #ccc !important;border-radius:3px !important;background:white !important;color:black !important;display:inline-block !important;text-align:center !important;';
            widthLabel.appendChild(widthInput);

            // 添加高度控制
            const heightLabel = document.createElement('label');
            heightLabel.textContent = 'Height: ';
            heightLabel.style.cssText =
              'font-family:Arial,sans-serif !important;font-size:14px !important;margin-right:0 !important;font-weight:normal !important;color:black !important;display:flex !important;align-items:center !important;white-space:nowrap !important;';
            const heightInput = document.createElement('input');
            heightInput.type = 'number';
            heightInput.value = '400';
            heightInput.min = '10';
            heightInput.style.cssText =
              'width:60px !important;height:28px !important;margin:0 5px !important;font-family:Arial,sans-serif !important;font-size:14px !important;padding:0 2px !important;box-sizing:border-box !important;border:1px solid #ccc !important;border-radius:3px !important;background:white !important;color:black !important;display:inline-block !important;text-align:center !important;';
            heightLabel.appendChild(heightInput);

            // 添加按钮
            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Capture';
            captureBtn.style.cssText =
              'background:#4CAF50 !important;color:white !important;border:none !important;padding:4px 10px !important;border-radius:3px !important;cursor:pointer !important;font-family:Arial,sans-serif !important;font-size:14px !important;height:28px !important;margin:0 2px !important;font-weight:normal !important;text-transform:none !important;box-shadow:none !important;display:inline-block !important;line-height:20px !important;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText =
              'background:#f44336 !important;color:white !important;border:none !important;padding:4px 10px !important;border-radius:3px !important;cursor:pointer !important;font-family:Arial,sans-serif !important;font-size:14px !important;height:28px !important;margin:0 2px !important;font-weight:normal !important;text-transform:none !important;box-shadow:none !important;display:inline-block !important;line-height:20px !important;';

            // 实现框体拖动
            let isDragging = false;
            let isResizing = false;
            let startX = 0;
            let startY = 0;
            let frameX = 0;
            let frameY = 0;
            let frameWidth = 500;
            let frameHeight = 400;
            let resizeHandle = '';

            // 初始化框体位置
            const updateFramePosition = function () {
              frameDiv.style.width = frameWidth + 'px';
              frameDiv.style.height = frameHeight + 'px';
              frameDiv.style.top = frameY + 'px';
              frameDiv.style.left = frameX + 'px';
              frameDiv.style.transform = 'none'; // 取消默认的居中变换

              // 更新输入框的值
              widthInput.value = frameWidth.toString();
              heightInput.value = frameHeight.toString();
            };

            // 初始化框体的位置（居中）
            const initRect = () => {
              const windowWidth = window.innerWidth;
              const windowHeight = window.innerHeight;
              frameX = (windowWidth - frameWidth) / 2;
              frameY = (windowHeight - frameHeight) / 2;
              updateFramePosition();
            };

            initRect();

            // 处理鼠标按下事件
            frameDiv.addEventListener('mousedown', e => {
              // 判断是否点击到了调整大小的把手
              const target = e.target as HTMLElement;
              if (target !== frameDiv) return;

              e.preventDefault();
              isDragging = true;
              isResizing = false;
              startX = e.clientX;
              startY = e.clientY;
            });

            // 处理调整大小的鼠标事件
            handleElements.forEach(handle => {
              handle.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = false;
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                resizeHandle = (e.target as HTMLElement).dataset.position || '';
              });
            });

            // 处理鼠标移动事件
            document.addEventListener('mousemove', e => {
              if (!isDragging && !isResizing) return;

              e.preventDefault();

              const moveX = e.clientX - startX;
              const moveY = e.clientY - startY;

              if (isDragging) {
                // 移动整个框
                frameX += moveX;
                frameY += moveY;
                updateFramePosition();
              } else if (isResizing) {
                // 调整框的大小
                switch (resizeHandle) {
                  case 'top-left':
                    frameX += moveX;
                    frameY += moveY;
                    frameWidth -= moveX;
                    frameHeight -= moveY;
                    break;
                  case 'top':
                    frameY += moveY;
                    frameHeight -= moveY;
                    break;
                  case 'top-right':
                    frameY += moveY;
                    frameWidth += moveX;
                    frameHeight -= moveY;
                    break;
                  case 'right':
                    frameWidth += moveX;
                    break;
                  case 'bottom-right':
                    frameWidth += moveX;
                    frameHeight += moveY;
                    break;
                  case 'bottom':
                    frameHeight += moveY;
                    break;
                  case 'bottom-left':
                    frameX += moveX;
                    frameWidth -= moveX;
                    frameHeight += moveY;
                    break;
                  case 'left':
                    frameX += moveX;
                    frameWidth -= moveX;
                    break;
                }

                // 确保宽度和高度不小于最小值
                if (frameWidth < 50) frameWidth = 50;
                if (frameHeight < 50) frameHeight = 50;

                updateFramePosition();
              }

              startX = e.clientX;
              startY = e.clientY;
            });

            // 处理鼠标释放事件
            document.addEventListener('mouseup', () => {
              isDragging = false;
              isResizing = false;
            });

            // 更新尺寸事件
            widthInput.onchange = function () {
              const newWidth = parseInt((this as HTMLInputElement).value);
              if (!isNaN(newWidth) && newWidth > 0) {
                frameWidth = newWidth;
                updateFramePosition();
              }
            };

            heightInput.onchange = function () {
              const newHeight = parseInt((this as HTMLInputElement).value);
              if (!isNaN(newHeight) && newHeight > 0) {
                frameHeight = newHeight;
                updateFramePosition();
              }
            };

            // 截图功能
            captureBtn.onclick = function () {
              // 隐藏控制界面和调整大小的把手
              controlsDiv.style.display = 'none';
              handleElements.forEach(handle => {
                handle.style.display = 'none';
              });
              frameDiv.style.border = 'none';
              frameDiv.style.background = 'transparent';

              // 等待UI更新
              setTimeout(function () {
                // 截图
                chrome.runtime.sendMessage({ type: 'captureVisibleTab' }, function (dataUrl) {
                  if (!dataUrl) {
                    alert('截图失败，请重试');
                    controlsDiv.style.display = 'flex';
                    handleElements.forEach(handle => {
                      handle.style.display = 'block';
                    });
                    frameDiv.style.border = '2px dashed red';
                    frameDiv.style.background = 'rgba(0,0,0,0.1)';
                    return;
                  }

                  // 创建一个图片对象
                  const img = new Image();
                  img.onload = function () {
                    const canvas = document.createElement('canvas');
                    canvas.width = frameWidth;
                    canvas.height = frameHeight;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(img, frameX, frameY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

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
          console.log('截图工具注入成功');
        } else {
          console.log(`截图工具注入失败: ${result?.error || '未知错误'}`);
        }
      })
      .catch(err => {
        console.log(`注入脚本出错: ${err.message}`);
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
        console.log(`截图状态检查: ${JSON.stringify(status)}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        console.log(`状态检查失败: ${errorMessage}`);
      }
    }, 1000);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(`注入截图工具失败: ${errorMsg}`);
  }
};

// 添加点击扩展图标的处理逻辑
chrome.action.onClicked.addListener(async tab => {
  try {
    if (!tab.id) {
      console.error('没有找到活动标签页ID');
      return;
    }

    const tabId = tab.id;
    const url = tab.url || '';
    console.log(`开始在标签页上执行截图: ${url}`);

    // 检查是否是特殊页面
    if (
      url.startsWith('chrome://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('devtools://') ||
      url.startsWith('https://chrome.google.com/')
    ) {
      // 对于特殊页面，可以创建一个通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: 'PixelCapture',
        message: 'Not on system pages',
      });
      return;
    }

    // 注入并执行简化版的截图工具
    await injectSimpleScreenshotTool(tabId);
  } catch (error) {
    console.error('执行截图失败:', error);
  }
});

// 添加全局类型声明
declare global {
  interface Window {
    _SCREENSHOT_INJECTION_STARTED?: boolean;
    _SCREENSHOT_CODE_RUNNING?: boolean;
    _SCREENSHOT_CODE_COMPLETED?: boolean;
    _SCREENSHOT_FORMAT?: {
      id: string;
      label: string;
      mime: string;
    };
  }
}

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, sender.tab?.id);

  // 处理直接截图命令
  if (message.type === 'direct-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      if (tabs[0]?.id) {
        const tab = tabs[0];
        try {
          const url = tab.url || '';
          console.log(`通过命令启动截图: ${url}`);

          // 检查是否是特殊页面
          if (
            url.startsWith('chrome://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:') ||
            url.startsWith('chrome-extension://') ||
            url.startsWith('devtools://') ||
            url.startsWith('https://chrome.google.com/')
          ) {
            // 对于特殊页面，创建一个通知
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon-128.png',
              title: 'PixelCapture',
              message: 'Not on system pages',
            });
            return;
          }

          // 注入并执行简化版的截图工具
          if (tab.id) {
            await injectSimpleScreenshotTool(tab.id);
          }
        } catch (error) {
          console.error('执行截图失败:', error);
        }
      }
    });
    return true;
  }

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
    const { imageData, format = 'png', width = 500, height = 400 } = message;
    console.log(`Saving screenshot in ${format} format`);

    // 获取当前日期和时间作为文件名
    const date = new Date();
    const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date
      .getDate()
      .toString()
      .padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;

    // 如果是PDF格式，使用jsPDF库转换
    if (format === 'pdf') {
      try {
        console.log('开始PDF转换', { format, width, height, imageDataLength: imageData.length });
        console.log('环境检查:', {
          hasWindow: typeof window !== 'undefined',
          hasDocument: typeof document !== 'undefined',
          hasCanvas: typeof HTMLCanvasElement !== 'undefined',
          hasURL: typeof URL !== 'undefined',
          hasBlob: typeof Blob !== 'undefined',
        });
        // 使用类型安全的方式访问PDFObject
        const globalPDFObject =
          'PDFObject' in globalThis ? (globalThis as unknown as Record<string, unknown>).PDFObject : undefined;
        console.log('PDFObject状态:', typeof globalPDFObject, globalPDFObject);

        // 创建PDF文档，设置合适的尺寸，禁用所有外部依赖
        const orientation = width > height ? 'l' : 'p'; // landscape or portrait
        console.log('PDF方向:', orientation);

        // 创建PDF文档，patch文件已确保安全性
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [width, height],
          hotfixes: ['px_scaling'],
        });
        console.log('jsPDF实例创建成功');

        // 将图像添加到PDF (需要移除URL前缀)
        const base64Image = imageData.replace('data:image/png;base64,', '');
        console.log('准备添加图像到PDF，base64长度:', base64Image.length);

        pdf.addImage(base64Image, 'PNG', 0, 0, width, height);
        console.log('图像添加到PDF成功');

        // 生成PDF并直接下载，完全避免PDFObject功能
        // 使用 'blob' 模式生成PDF，避免触发 pdfobjectnewwindow 代码路径
        console.log('准备生成PDF blob');
        const pdfBlob = pdf.output('blob');
        console.log('PDF blob生成成功，大小:', pdfBlob.size);

        // 创建 Blob URL
        const pdfUrl = URL.createObjectURL(pdfBlob);
        console.log('PDF URL创建成功:', pdfUrl);

        // 使用 chrome.downloads API 下载
        console.log('开始下载PDF');
        chrome.downloads.download(
          {
            url: pdfUrl,
            filename: `screenshot_${dateString}.pdf`,
            saveAs: true,
          },
          downloadId => {
            console.log('PDF下载请求完成，downloadId:', downloadId);
            // 监听下载完成事件，以便释放 Blob URL
            if (downloadId) {
              const listener = (delta: chrome.downloads.DownloadDelta) => {
                if (delta.id === downloadId && delta.state && delta.state.current === 'complete') {
                  console.log('PDF下载完成');
                  // 下载完成后释放 Blob URL
                  URL.revokeObjectURL(pdfUrl);
                  // 移除监听器
                  chrome.downloads.onChanged.removeListener(listener);
                }
              };
              chrome.downloads.onChanged.addListener(listener);
            }
          },
        );
        console.log('PDF转换和下载流程完成');
      } catch (error) {
        console.error('PDF转换失败:', error);
        // 如果PDF转换失败，回退到PNG格式
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon-128.png',
          title: 'PDF转换失败',
          message: '无法转换为PDF格式，已保存为PNG格式',
        });

        chrome.downloads.download({
          url: imageData,
          filename: `screenshot_${dateString}.png`,
          saveAs: true,
        });
      }
    } else {
      // 下载其他图片格式
      chrome.downloads.download({
        url: imageData,
        filename: `screenshot_${dateString}.${format}`,
        saveAs: true,
      });
    }

    return true;
  }

  // 检查内容脚本状态
  if (message.type === 'checkContentScriptStatus' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const isInitialized = contentScriptStatus.initialized.get(tabId) === true;
    sendResponse({ initialized: isInitialized });
    return true;
  }

  // Handle user status update
  if (message.type === 'USER_STATUS_UPDATE') {
    handleUserStatusUpdate(message.status);
    sendResponse({ success: true });
    return true;
  }

  return true;
});

// 标签关闭时清理状态
chrome.tabs.onRemoved.addListener(tabId => {
  contentScriptStatus.initialized.delete(tabId);
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(command => {
  if (command === 'direct-screenshot') {
    console.log('通过快捷键启动截图');
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      if (tabs[0]?.id) {
        const tab = tabs[0];
        try {
          const url = tab.url || '';
          console.log(`在标签页上执行截图: ${url}`);

          // 检查是否是特殊页面
          if (
            url.startsWith('chrome://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:') ||
            url.startsWith('chrome-extension://') ||
            url.startsWith('devtools://') ||
            url.startsWith('https://chrome.google.com/')
          ) {
            // 对于特殊页面，创建一个通知
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon-128.png',
              title: 'PixelCapture',
              message: 'Not on system pages',
            });
            return;
          }

          // 注入并执行简化版的截图工具
          if (tab.id) {
            await injectSimpleScreenshotTool(tab.id);
          }
        } catch (error) {
          console.error('执行截图失败:', error);
        }
      }
    });
  }
});

// User status update handler
const handleUserStatusUpdate = async (status: UserStatus) => {
  try {
    // Store user status
    await chrome.storage.local.set({
      userStatus: status,
      lastUpdate: Date.now(),
    });

    // Display status update notification
    const statusText = getStatusText(status);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: 'Status Synced',
      message: statusText,
    });

    colorfulLog(`User status updated: ${JSON.stringify(status)}`, 'success');
  } catch (error) {
    console.error('Failed to save user status:', error);
  }
};

// Get status text description
const getStatusText = (status: UserStatus): string => {
  if (!status.isLoggedIn) return 'Not logged in';
  if (status.isPro) return 'Pro user logged in';
  if (status.isInTrial) return 'Trial user logged in';
  return 'Free user logged in';
};

// Utility function to get user status
const getUserStatus = async (): Promise<UserStatus> => {
  try {
    const result = await chrome.storage.local.get(['userStatus']);
    return (
      result.userStatus || {
        isLoggedIn: false,
        isPro: false,
        isInTrial: false,
      }
    );
  } catch (error) {
    console.error('Failed to get user status:', error);
    return {
      isLoggedIn: false,
      isPro: false,
      isInTrial: false,
    };
  }
};

// Modify the existing screenshot permission check
const originalInjectSimpleScreenshotTool = injectSimpleScreenshotTool;
injectSimpleScreenshotTool = async (tabId: number) => {
  const userStatus = await getUserStatus();

  // Check login status
  if (!userStatus.isLoggedIn) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: 'Login Required',
      message: 'Please login on the website to use screenshot feature',
    });
    return;
  }

  // Check permissions (Pro users or trial users can use advanced features)
  if (!userStatus.isPro && !userStatus.isInTrial) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: 'Permission Restricted',
      message: 'Some features require Pro subscription or trial',
    });
    // Still allow basic screenshot feature
  }

  // Execute screenshot
  await originalInjectSimpleScreenshotTool(tabId);
};
