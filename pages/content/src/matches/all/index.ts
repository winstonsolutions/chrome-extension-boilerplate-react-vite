import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

console.log('Content script loaded for PixelCapture');

// Listen to messages from the webpage
window.addEventListener('message', event => {
  // Security check
  if (event.source !== window) return;

  if (!event.data || event.data.source !== 'pixel-capture-website') return;

  console.log('Content script received message:', event.data.type);

  // Handle user status update
  if (event.data.type === 'PIXEL_CAPTURE_USER_STATUS') {
    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'USER_STATUS_UPDATE',
      status: event.data.status,
      timestamp: event.data.timestamp,
    });

    // Send confirmation message to webpage (optional)
    window.postMessage(
      {
        type: 'PIXEL_CAPTURE_STATUS_RECEIVED',
        success: true,
        source: 'pixel-capture-extension',
      },
      '*',
    );
  }

  // Handle ping message
  if (event.data.type === 'PIXEL_CAPTURE_PING') {
    window.postMessage(
      {
        type: 'PIXEL_CAPTURE_PONG',
        source: 'pixel-capture-extension',
      },
      '*',
    );
  }
});

// Notify webpage that extension is ready
window.postMessage(
  {
    type: 'PIXEL_CAPTURE_EXTENSION_READY',
    source: 'pixel-capture-extension',
  },
  '*',
);
