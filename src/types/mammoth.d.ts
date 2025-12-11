/**
 * Mammoth库类型声明
 */

declare module 'mammoth' {
  interface ExtractRawTextOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
  }

  interface ExtractRawTextResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  interface ConvertToHtmlOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
    styleMap?: string[];
  }

  interface ConvertToHtmlResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;
  export function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertToHtmlResult>;
}