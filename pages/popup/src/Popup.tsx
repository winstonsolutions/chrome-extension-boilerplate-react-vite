import '@src/Popup.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect } from 'react';

// User status interface
interface UserStatus {
  isLoggedIn: boolean;
  isPro: boolean;
  isInTrial: boolean;
}

const Popup = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('png');
  // Replace hardcoded isPro state with user status management
  const [userStatus, setUserStatus] = useState<UserStatus>({
    isLoggedIn: false,
    isPro: false,
    isInTrial: false,
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [currentEnv, setCurrentEnv] = useState<string>('development');

  // Load user status
  useEffect(() => {
    chrome.storage.local.get(['userStatus']).then(result => {
      if (result.userStatus) {
        setUserStatus(result.userStatus);
      }
      setStatusLoading(false);
    });
  }, []);

  // Calculate permissions
  const isPro = userStatus.isPro || userStatus.isInTrial; // Pro or trial users have Pro permissions

  // Auth config - easy to change between environments
  const AUTH_CONFIG = {
    development: 'http://localhost:3000',
    production: 'https://pixelcapture.example.com', // Replace with actual production URL when deployed
  };

  // Load environment setting from storage
  useEffect(() => {
    chrome.storage.local.get(['pixelcapture_env'], result => {
      if (result.pixelcapture_env) {
        setCurrentEnv(result.pixelcapture_env);
      }
    });
  }, []);

  const baseUrl = AUTH_CONFIG[currentEnv as keyof typeof AUTH_CONFIG];
  const signInUrl = `${baseUrl}/sign-in`;

  // Handle profile click
  const handleProfileClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    // If shift key is pressed, toggle environment
    if ('shiftKey' in e && e.shiftKey) {
      const newEnv = currentEnv === 'development' ? 'production' : 'development';
      setCurrentEnv(newEnv);
      // Save to storage
      chrome.storage.local.set({ pixelcapture_env: newEnv });

      setErrorMessage(`Environment switched to: ${newEnv}`);
      // Clear message after 2 seconds
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }

    // Normal click opens sign-in page
    chrome.tabs.create({ url: signInUrl });
  };

  // Formats configuration
  const formats = [
    { id: 'png', label: 'PNG', mime: 'image/png' },
    { id: 'jpeg', label: 'JPG', mime: 'image/jpeg' },
    { id: 'webp', label: 'WebP', mime: 'image/webp' },
    { id: 'pdf', label: 'PDF', mime: 'application/pdf', requiresPro: true },
  ];

  // Handle format selection
  const handleFormatSelect = (formatId: string) => {
    const format = formats.find(f => f.id === formatId);
    if (format?.requiresPro && !isPro) {
      setErrorMessage('PDF export requires a Pro account');
      return;
    }

    setSelectedFormat(formatId);
    setErrorMessage(null);
  };

  // Inject simplified screenshot tool
  const injectSimpleScreenshotTool = async (tabId: number) => {
    try {
      console.log('Preparing to inject screenshot tool...');

      // First try to inject script string
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Add a global marker indicating the code has been executed
          window._SCREENSHOT_INJECTION_STARTED = true;
          console.log('Injection function started executing');
        },
      });

      console.log('Initialization injection successful');

      // Get selected format from state and pass to script
      const format = formats.find(f => f.id === selectedFormat);

      // Inject the main screenshot code
      await chrome.scripting
        .executeScript({
          target: { tabId },
          func: function (format) {
            try {
              console.log('Starting screenshot tool code');
              window._SCREENSHOT_CODE_RUNNING = true;
              // Store format information
              window._SCREENSHOT_FORMAT = format;

              // Directly execute code instead of using new Function
              // Create screenshot frame and control panel
              const frameDiv = document.createElement('div');
              frameDiv.style.cssText =
                'position:fixed;width:500px;height:400px;border:2px dashed red;background:rgba(0,0,0,0.1);z-index:9999999;top:50%;left:50%;transform:translate(-50%,-50%);cursor:move;';
              document.body.appendChild(frameDiv);

              // Add drag handles (8 directions)
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

              // Add width control
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

              // Add height control
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

              // Add button
              const captureBtn = document.createElement('button');
              captureBtn.textContent = 'Capture';
              captureBtn.style.cssText =
                'background:#4CAF50 !important;color:white !important;border:none !important;padding:4px 10px !important;border-radius:3px !important;cursor:pointer !important;font-family:Arial,sans-serif !important;font-size:14px !important;height:28px !important;margin:0 2px !important;font-weight:normal !important;text-transform:none !important;box-shadow:none !important;display:inline-block !important;line-height:20px !important;';

              const cancelBtn = document.createElement('button');
              cancelBtn.textContent = 'Cancel';
              cancelBtn.style.cssText =
                'background:#f44336 !important;color:white !important;border:none !important;padding:4px 10px !important;border-radius:3px !important;cursor:pointer !important;font-family:Arial,sans-serif !important;font-size:14px !important;height:28px !important;margin:0 2px !important;font-weight:normal !important;text-transform:none !important;box-shadow:none !important;display:inline-block !important;line-height:20px !important;';

              // Implement frame dragging
              let isDragging = false;
              let isResizing = false;
              let startX = 0;
              let startY = 0;
              let frameX = 0;
              let frameY = 0;
              let frameWidth = 500;
              let frameHeight = 400;
              let resizeHandle = '';

              // Initialize frame position
              const updateFramePosition = function () {
                frameDiv.style.width = frameWidth + 'px';
                frameDiv.style.height = frameHeight + 'px';
                frameDiv.style.top = frameY + 'px';
                frameDiv.style.left = frameX + 'px';
                frameDiv.style.transform = 'none'; // Cancel default center transform

                // Update input field values
                widthInput.value = frameWidth.toString();
                heightInput.value = frameHeight.toString();
              };

              // Initialize frame position (center)
              const initRect = () => {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                frameX = (windowWidth - frameWidth) / 2;
                frameY = (windowHeight - frameHeight) / 2;
                updateFramePosition();
              };

              initRect();

              // Handle mouse down event
              frameDiv.addEventListener('mousedown', e => {
                // Check if clicked on resizing handle
                const target = e.target as HTMLElement;
                if (target !== frameDiv) return;

                e.preventDefault();
                isDragging = true;
                isResizing = false;
                startX = e.clientX;
                startY = e.clientY;
              });

              // Handle resizing mouse event
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

              // Handle mouse move event
              document.addEventListener('mousemove', e => {
                if (!isDragging && !isResizing) return;

                e.preventDefault();

                const moveX = e.clientX - startX;
                const moveY = e.clientY - startY;

                if (isDragging) {
                  // Move entire frame
                  frameX += moveX;
                  frameY += moveY;
                  updateFramePosition();
                } else if (isResizing) {
                  // Resize frame
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

                  // Ensure width and height are not less than minimum value
                  if (frameWidth < 50) frameWidth = 50;
                  if (frameHeight < 50) frameHeight = 50;

                  updateFramePosition();
                }

                startX = e.clientX;
                startY = e.clientY;
              });

              // Handle mouse release event
              document.addEventListener('mouseup', () => {
                isDragging = false;
                isResizing = false;
              });

              // Update size event
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

              // Screenshot function
              captureBtn.onclick = function () {
                // Hide control interface and resizing handles
                controlsDiv.style.display = 'none';
                handleElements.forEach(handle => {
                  handle.style.display = 'none';
                });
                frameDiv.style.border = 'none';
                frameDiv.style.background = 'transparent';

                // Wait for UI update
                setTimeout(function () {
                  // Screenshot
                  chrome.runtime.sendMessage({ type: 'captureVisibleTab' }, function (dataUrl) {
                    if (!dataUrl) {
                      alert('Screenshot failed, please try again');
                      controlsDiv.style.display = 'flex';
                      handleElements.forEach(handle => {
                        handle.style.display = 'block';
                      });
                      frameDiv.style.border = '2px dashed red';
                      frameDiv.style.background = 'rgba(0,0,0,0.1)';
                      return;
                    }

                    // Create image object
                    const img = new Image();
                    img.onload = function () {
                      const canvas = document.createElement('canvas');
                      canvas.width = frameWidth;
                      canvas.height = frameHeight;

                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, frameX, frameY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

                        // Use selected format for image conversion
                        let imageData;
                        const formatInfo = window._SCREENSHOT_FORMAT || { id: 'png', mime: 'image/png' };

                        // Handle PDF format specially
                        if (formatInfo.id === 'pdf') {
                          // For PDF, we still need to send PNG data and let background script handle conversion
                          imageData = canvas.toDataURL('image/png');
                        } else {
                          // For other image formats, use the specified MIME type
                          imageData = canvas.toDataURL(formatInfo.mime, 0.92);
                        }

                        // Send to backend for saving
                        chrome.runtime.sendMessage({
                          type: 'saveScreenshot',
                          imageData: imageData,
                          format: formatInfo.id,
                          mime: formatInfo.mime,
                          width: frameWidth,
                          height: frameHeight,
                        });
                      } else {
                        console.error('Cannot get Canvas context');
                      }

                      // Clean UI
                      document.body.removeChild(frameDiv);
                      document.body.removeChild(controlsDiv);
                    };

                    img.src = dataUrl;
                  });
                }, 100);
              };

              // Cancel function
              cancelBtn.onclick = function () {
                document.body.removeChild(frameDiv);
                document.body.removeChild(controlsDiv);
              };

              // Assemble UI elements
              controlsDiv.appendChild(widthLabel);
              controlsDiv.appendChild(heightLabel);
              controlsDiv.appendChild(captureBtn);
              controlsDiv.appendChild(cancelBtn);
              document.body.appendChild(controlsDiv);

              console.log('Screenshot tool code execution completed');
              window._SCREENSHOT_CODE_COMPLETED = true;
              return { success: true };
            } catch (err: unknown) {
              console.error('Screenshot code execution error:', err);
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              return {
                success: false,
                error: errorMessage,
              };
            }
          },
          args: [format],
        })
        .then(results => {
          const result = results[0]?.result;
          if (result?.success) {
            console.log('Screenshot tool injection successful');
          } else {
            console.log(`Screenshot tool injection failed: ${result?.error || 'Unknown error'}`);
            setErrorMessage(`Screenshot tool injection failed: ${result?.error || 'Unknown error'}`);
          }
        })
        .catch(err => {
          console.log(`Script injection error: ${err.message}`);
          setErrorMessage(`Script injection error: ${err.message}`);
        });

      // No need for timeout check anymore since popup will be closed already
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Screenshot tool injection failed: ${errorMsg}`);
      setErrorMessage(`Injection failed: ${errorMsg}`);
    }
  };

  // Execute screenshot directly in current tab
  const handleDirectScreenshot = async () => {
    try {
      // Check if trying to use PDF without Pro access
      if (selectedFormat === 'pdf' && !isPro) {
        setErrorMessage('PDF export requires a Pro account');
        return;
      }

      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        setErrorMessage('No active tab found');
        return;
      }

      const tabId = tabs[0].id;
      const url = tabs[0].url || '';

      // Check if it's a special page
      if (
        url.startsWith('chrome://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('devtools://')
      ) {
        setErrorMessage('This feature cannot be used on browser internal pages');
        return;
      }

      // Close popup immediately
      console.log('Starting screenshot on tab:', url);

      // Start injection process but don't await it
      injectSimpleScreenshotTool(tabId);

      // Close popup window immediately
      window.close();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Screenshot failed: ${errorMsg}`);
      setErrorMessage(`Screenshot failed: ${errorMsg}`);
    }
  };

  // Update the JSX to use the new status-dependent styling
  return (
    <div className={cn('App', 'bg-slate-50')}>
      <header className={cn('App-header', 'text-gray-900')}>
        <h1 className="mb-4 text-xl font-bold text-blue-600">PixelCapture</h1>

        <button
          className={cn(
            'screenshot-button mb-4 w-64 rounded-md bg-blue-600 px-10 py-3 text-lg font-medium text-white transition-colors hover:bg-blue-700',
          )}
          onClick={handleDirectScreenshot}>
          Capture
        </button>

        <div className="format-selector mb-4 grid w-64 grid-cols-2 gap-2">
          {formats.map(format => (
            <button
              key={format.id}
              className={cn(
                'relative rounded-md px-2 py-2 text-sm font-medium transition-colors',
                selectedFormat === format.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
              )}
              onClick={() => handleFormatSelect(format.id)}>
              {format.label}
              {format.id === 'pdf' && (
                <span className={cn('pro-badge', userStatus.isPro || userStatus.isInTrial ? 'pro-active' : '')}>
                  Pro
                </span>
              )}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="error-message mb-4 max-w-[250px] rounded-md bg-red-100 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
      </header>

      {/* User Profile Avatar */}
      <button
        className="user-avatar"
        onClick={handleProfileClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleProfileClick(e);
          }
        }}
        title={`Sign in (${currentEnv})`}
        aria-label="Sign in">
        <div className={cn('avatar-icon', userStatus.isLoggedIn ? 'logged-in' : '', statusLoading ? 'loading' : '')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path
              fillRule="evenodd"
              d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <span className="avatar-status">{userStatus.isLoggedIn ? 'Signed in' : 'Please sign in'}</span>
      </button>
    </div>
  );
};

// Add global type declaration
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

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
