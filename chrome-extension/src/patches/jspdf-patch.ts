// jsPDF补丁文件 - 禁用PDFObject以避免Manifest V3违规
// 不导入PDFObject，完全禁用相关功能

// 扩展Window接口但不实际添加PDFObject
declare global {
  interface Window {
    PDFObject?: unknown; // 可选，确保jsPDF不会尝试使用外部CDN
  }
}

// 明确设置PDFObject为undefined，强制jsPDF使用其他输出模式
window.PDFObject = undefined;

console.log('PDFObject功能已禁用，避免Manifest V3违规');

export {};
