import { useState, useRef } from 'react';

interface ScreenshotToolProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const ScreenshotTool = ({ onCapture, onClose }: ScreenshotToolProps) => {
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(400);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleCapture = async () => {
    try {
      // Capture visible tab
      chrome.runtime.sendMessage({ type: 'captureVisibleTab' }, dataUrl => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }

        if (frameRef.current) {
          const rect = frameRef.current.getBoundingClientRect();

          // Create an image from the captured screenshot
          const img = new Image();
          img.onload = () => {
            // Create a canvas to crop the image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Draw only the portion of the image that is within the frame
              ctx.drawImage(img, rect.left, rect.top, width, height, 0, 0, width, height);

              // Convert canvas to data URL
              const croppedDataUrl = canvas.toDataURL('image/png');
              onCapture(croppedDataUrl);
            }
          };
          img.src = dataUrl;
        }
      });
    } catch (error) {
      console.error('Screenshot error:', error);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    if (!isNaN(newWidth) && newWidth > 0) {
      setWidth(newWidth);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    if (!isNaN(newHeight) && newHeight > 0) {
      setHeight(newHeight);
    }
  };

  return (
    <div className="screenshot-tool">
      <div
        ref={frameRef}
        className="screenshot-frame"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: 'fixed',
          border: '2px dashed red',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="screenshot-controls"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 10000,
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
        <label>
          宽度:
          <input
            type="number"
            value={width}
            onChange={handleWidthChange}
            min="10"
            style={{ width: '70px', margin: '0 10px' }}
          />
        </label>
        <label>
          高度:
          <input
            type="number"
            value={height}
            onChange={handleHeightChange}
            min="10"
            style={{ width: '70px', margin: '0 10px' }}
          />
        </label>
        <button
          onClick={handleCapture}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}>
          截图
        </button>
        <button
          onClick={onClose}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
          }}>
          取消
        </button>
      </div>
    </div>
  );
};
