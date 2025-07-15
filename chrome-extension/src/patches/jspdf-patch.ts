// jsPDF补丁文件，用于拦截和修改jsPDF的PDFObject加载行为
import PDFObject from 'pdfobject';

// 正确扩展Window接口
declare global {
  interface Window {
    PDFObject: typeof PDFObject;
  }
}

// 将PDFObject添加到全局window对象
window.PDFObject = PDFObject;

// jsPDF内部会检查PDFObject是否存在，如果存在就不会从CDN加载
console.log('PDFObject patch applied, version:', PDFObject.pdfobjectversion);

export {};
