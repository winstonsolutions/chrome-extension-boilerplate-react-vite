// jsPDF补丁文件 - 部分禁用PDFObject以避免Manifest V3违规
// 保留jsPDF核心功能，但禁用外部CDN依赖

// 扩展Window接口
declare global {
  interface Window {
    PDFObject?: {
      embed?: (...args: unknown[]) => void;
      [key: string]: unknown;
    };
  }
}

// 创建一个虚拟的PDFObject，避免jsPDF加载外部CDN
// 但保留基本接口，让jsPDF的blob输出模式能正常工作
window.PDFObject = {
  // 禁用embed功能，这是触发CDN加载的主要函数
  embed: () => {
    console.warn('PDFObject.embed已被禁用以符合Manifest V3要求');
    return false;
  },
  // 添加其他可能需要的属性作为占位符
  supportsPDFs: false,
  pdfobjectversion: '0.0.0',
};

console.log('PDFObject已部分禁用，保留jsPDF核心PDF生成功能');

export {};
