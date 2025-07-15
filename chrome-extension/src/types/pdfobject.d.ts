declare module 'pdfobject' {
  interface PDFObjectOptions {
    fallbackLink?: string | boolean;
    pdfOpenParams?: object;
    forcePDFJS?: boolean;
    PDFJS_URL?: string;
    id?: string;
    // 使用更具体的类型代替any
    [key: string]: string | number | boolean | object | undefined;
  }

  interface PDFObject {
    embed: (pdf: string, target: string | Element, options?: PDFObjectOptions) => boolean;
    pdfobjectversion: string;
    supportsPDFs: boolean;
  }

  const pdfObject: PDFObject;
  export default pdfObject;
}
