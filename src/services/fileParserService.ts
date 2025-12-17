/**
 * 文件解析服务
 * 支持PDF、Word、Markdown和文本文件的内容提取
 * 集成缓存功能提升性能
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { fileCacheService } from './cacheService';

// 设置PDF.js worker路径
// 使用unpkg CDN，更稳定可靠
// pdfjs-dist 4.x 版本需要使用 .mjs 后缀的ES模块worker
const PDFJS_VERSION = pdfjsLib.version;
console.log('PDF.js版本:', PDFJS_VERSION);

// 尝试多个CDN源，提高可用性
const workerSources = [
  `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`,
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`,
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`,
];

// 设置默认worker源
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSources[0];

// 文件解析错误类
export class FileParseError extends Error {
  constructor(
    message: string,
    public readonly fileName: string,
    public readonly fileType: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileParseError';
  }
}

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  MARKDOWN: 'text/markdown',
  TEXT: 'text/plain'
} as const;

// 文件解析结果
export interface ParseResult {
  content: string;           // 提取的文本内容
  fileName: string;          // 文件名
  fileType: string;          // 文件类型
  fileSize: number;          // 文件大小（字节）
  pageCount?: number;        // 页数（PDF专用）
  wordCount: number;         // 字数
  extractedAt: number;       // 提取时间戳
}

// 进度回调函数类型
export type ProgressCallback = (progress: number, message?: string) => void;

// 文件解析服务接口
export interface FileParserService {
  /**
   * 解析PDF文件
   * @param file PDF文件
   * @param onProgress 进度回调
   * @returns 解析结果
   */
  parsePDF(file: File, onProgress?: ProgressCallback): Promise<ParseResult>;
  
  /**
   * 解析Word文档
   * @param file Word文件
   * @param onProgress 进度回调
   * @returns 解析结果
   */
  parseWord(file: File, onProgress?: ProgressCallback): Promise<ParseResult>;
  
  /**
   * 解析Markdown文件
   * @param file Markdown文件
   * @param onProgress 进度回调
   * @returns 解析结果
   */
  parseMarkdown(file: File, onProgress?: ProgressCallback): Promise<ParseResult>;
  
  /**
   * 解析纯文本文件
   * @param file 文本文件
   * @param onProgress 进度回调
   * @returns 解析结果
   */
  parseText(file: File, onProgress?: ProgressCallback): Promise<ParseResult>;
  
  /**
   * 检测文件类型
   * @param file 文件对象
   * @returns 文件类型
   */
  detectFileType(file: File): string;
  
  /**
   * 解析任意支持的文件
   * @param file 文件对象
   * @param onProgress 进度回调
   * @returns 解析结果
   */
  parseFile(file: File, onProgress?: ProgressCallback): Promise<ParseResult>;
  
  /**
   * 批量解析文件
   * @param files 文件列表
   * @param onProgress 进度回调
   * @param onFileProgress 单个文件进度回调
   * @returns 解析结果列表
   */
  parseFiles(
    files: File[], 
    onProgress?: ProgressCallback,
    onFileProgress?: (fileName: string, progress: number, message?: string) => void
  ): Promise<ParseResult[]>;
}

/**
 * 文件解析服务实现
 */
export class FileParserServiceImpl implements FileParserService {
  
  /**
   * 尝试使用不同的worker源加载PDF
   * @param arrayBuffer PDF文件的ArrayBuffer
   * @returns PDF文档对象
   */
  private async loadPDFWithFallback(arrayBuffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < workerSources.length; i++) {
      try {
        console.log(`尝试使用worker源 ${i + 1}/${workerSources.length}: ${workerSources[i]}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSources[i];
        
        const loadingTask = pdfjsLib.getDocument({ 
          data: arrayBuffer,
          // 禁用worker如果所有CDN都失败
          disableAutoFetch: false,
          disableStream: false,
        });
        
        const pdf = await loadingTask.promise;
        console.log(`成功使用worker源: ${workerSources[i]}`);
        return pdf;
      } catch (error) {
        console.warn(`Worker源 ${workerSources[i]} 加载失败:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 如果是最后一个源，尝试禁用worker
        if (i === workerSources.length - 1) {
          console.log('所有CDN源失败，尝试禁用worker...');
          try {
            // 禁用worker，使用主线程解析（性能较差但更可靠）
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
            const loadingTask = pdfjsLib.getDocument({ 
              data: arrayBuffer,
              disableAutoFetch: true,
              disableStream: true,
            });
            const pdf = await loadingTask.promise;
            console.log('成功使用主线程解析PDF');
            return pdf;
          } catch (fallbackError) {
            console.error('主线程解析也失败:', fallbackError);
          }
        }
      }
    }
    
    throw lastError || new Error('无法加载PDF文档');
  }

  /**
   * 解析PDF文件
   */
  async parsePDF(file: File, onProgress?: ProgressCallback): Promise<ParseResult> {
    try {
      onProgress?.(10, '正在读取PDF文件...');
      
      // 将文件转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      onProgress?.(20, '正在加载PDF文档...');
      
      // 使用回退机制加载PDF文档
      const pdf = await this.loadPDFWithFallback(arrayBuffer);
      
      let fullText = '';
      const pageCount = pdf.numPages;
      
      onProgress?.(30, `开始解析PDF页面 (共${pageCount}页)...`);
      
      // 逐页提取文本
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 拼接页面文本
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
        
        // 更新进度
        const progress = 30 + (pageNum / pageCount) * 60;
        onProgress?.(progress, `正在解析第${pageNum}页...`);
      }
      
      onProgress?.(90, '正在清理文本内容...');
      
      // 清理文本
      const cleanedText = this.cleanText(fullText);
      
      return {
        content: cleanedText,
        fileName: file.name,
        fileType: 'PDF',
        fileSize: file.size,
        pageCount,
        wordCount: this.countWords(cleanedText),
        extractedAt: Date.now()
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('PDF解析失败:', errorMessage);
      throw new FileParseError(
        `PDF解析失败: ${errorMessage}。请确保网络连接正常，或尝试使用其他格式的文件。`,
        file.name,
        'PDF',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 解析Word文档
   */
  async parseWord(file: File, onProgress?: ProgressCallback): Promise<ParseResult> {
    try {
      onProgress?.(10, '正在读取Word文档...');
      
      // 将文件转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      onProgress?.(50, '正在解析Word文档内容...');
      
      // 使用mammoth解析Word文档
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      onProgress?.(90, '正在清理文本内容...');
      
      // 清理文本
      const cleanedText = this.cleanText(result.value);
      
      return {
        content: cleanedText,
        fileName: file.name,
        fileType: file.name.endsWith('.docx') ? 'DOCX' : 'DOC',
        fileSize: file.size,
        wordCount: this.countWords(cleanedText),
        extractedAt: Date.now()
      };
      
    } catch (error) {
      throw new FileParseError(
        `Word文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        file.name,
        'Word',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 解析Markdown文件
   */
  async parseMarkdown(file: File, onProgress?: ProgressCallback): Promise<ParseResult> {
    try {
      onProgress?.(20, '正在读取Markdown文件...');
      
      // 读取文件文本内容
      const text = await file.text();
      
      onProgress?.(80, '正在处理Markdown内容...');
      
      // 清理文本（保留Markdown格式）
      const cleanedText = this.cleanText(text);
      
      return {
        content: cleanedText,
        fileName: file.name,
        fileType: 'Markdown',
        fileSize: file.size,
        wordCount: this.countWords(cleanedText),
        extractedAt: Date.now()
      };
      
    } catch (error) {
      throw new FileParseError(
        `Markdown文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        file.name,
        'Markdown',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 解析纯文本文件
   */
  async parseText(file: File, onProgress?: ProgressCallback): Promise<ParseResult> {
    try {
      onProgress?.(30, '正在读取文本文件...');
      
      // 读取文件文本内容
      const text = await file.text();
      
      onProgress?.(80, '正在处理文本内容...');
      
      // 清理文本
      const cleanedText = this.cleanText(text);
      
      return {
        content: cleanedText,
        fileName: file.name,
        fileType: 'Text',
        fileSize: file.size,
        wordCount: this.countWords(cleanedText),
        extractedAt: Date.now()
      };
      
    } catch (error) {
      throw new FileParseError(
        `文本文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        file.name,
        'Text',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 检测文件类型
   */
  detectFileType(file: File): string {
    const mimeType = file.type;
    const extension = file.name.toLowerCase().split('.').pop();
    
    // 根据MIME类型检测
    if (mimeType === SUPPORTED_FILE_TYPES.PDF) {
      return 'PDF';
    }
    
    if (mimeType === SUPPORTED_FILE_TYPES.DOC || mimeType === SUPPORTED_FILE_TYPES.DOCX) {
      return 'Word';
    }
    
    // 根据文件扩展名检测
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'Word';
      case 'md':
      case 'markdown':
        return 'Markdown';
      case 'txt':
        return 'Text';
      default:
        // 默认尝试作为文本文件处理
        return 'Text';
    }
  }
  
  /**
   * 解析任意支持的文件（带缓存）
   */
  async parseFile(file: File, onProgress?: ProgressCallback): Promise<ParseResult> {
    onProgress?.(5, '检查缓存...');
    
    // 检查缓存
    const cachedContent = fileCacheService.getFileContent(file);
    if (cachedContent) {
      onProgress?.(100, '从缓存加载完成');
      console.log(`从缓存加载文件: ${file.name}`);
      return {
        content: cachedContent,
        fileName: file.name,
        fileType: this.detectFileType(file),
        fileSize: file.size,
        wordCount: this.countWords(cachedContent),
        extractedAt: Date.now()
      };
    }

    onProgress?.(10, '检测文件类型...');
    const fileType = this.detectFileType(file);
    let result: ParseResult;
    
    switch (fileType) {
      case 'PDF':
        result = await this.parsePDF(file, (progress, message) => {
          onProgress?.(10 + progress * 0.8, message);
        });
        break;
      case 'Word':
        result = await this.parseWord(file, (progress, message) => {
          onProgress?.(10 + progress * 0.8, message);
        });
        break;
      case 'Markdown':
        result = await this.parseMarkdown(file, (progress, message) => {
          onProgress?.(10 + progress * 0.8, message);
        });
        break;
      case 'Text':
        result = await this.parseText(file, (progress, message) => {
          onProgress?.(10 + progress * 0.8, message);
        });
        break;
      default:
        throw new FileParseError(
          `不支持的文件类型: ${fileType}`,
          file.name,
          fileType
        );
    }

    onProgress?.(95, '缓存解析结果...');
    
    // 缓存解析结果
    fileCacheService.cacheFileContent(file, result.content);
    console.log(`缓存文件内容: ${file.name}`);
    
    onProgress?.(100, '解析完成');
    
    return result;
  }
  
  /**
   * 清理文本内容
   * @param text 原始文本
   * @returns 清理后的文本
   */
  private cleanText(text: string): string {
    return text
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除行首行尾空白
      .replace(/^\s+|\s+$/gm, '')
      // 移除多余的换行符
      .replace(/\n\s*\n/g, '\n')
      // 整体trim
      .trim();
  }
  
  /**
   * 批量解析文件
   */
  async parseFiles(
    files: File[], 
    onProgress?: ProgressCallback,
    onFileProgress?: (fileName: string, progress: number, message?: string) => void
  ): Promise<ParseResult[]> {
    const results: ParseResult[] = [];
    const totalFiles = files.length;
    
    onProgress?.(0, `开始解析 ${totalFiles} 个文件...`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = i + 1;
      
      try {
        onProgress?.(
          (i / totalFiles) * 100, 
          `正在解析第 ${fileIndex}/${totalFiles} 个文件: ${file.name}`
        );
        
        const result = await this.parseFile(file, (progress, message) => {
          onFileProgress?.(file.name, progress, message);
        });
        
        results.push(result);
        
        onProgress?.(
          (fileIndex / totalFiles) * 100, 
          `已完成 ${fileIndex}/${totalFiles} 个文件`
        );
        
      } catch (error) {
        console.error(`解析文件 ${file.name} 失败:`, error);
        
        // 继续处理其他文件，但记录错误
        const errorResult: ParseResult = {
          content: '',
          fileName: file.name,
          fileType: this.detectFileType(file),
          fileSize: file.size,
          wordCount: 0,
          extractedAt: Date.now()
        };
        
        results.push(errorResult);
        
        onFileProgress?.(file.name, 100, `解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
    
    onProgress?.(100, `批量解析完成，共处理 ${totalFiles} 个文件`);
    
    return results;
  }

  /**
   * 统计字数
   * @param text 文本内容
   * @returns 字数
   */
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    
    // 中文字符按字符计算，英文按单词计算
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, '') // 移除中文字符
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    
    return chineseChars + englishWords;
  }
}

// 创建服务实例
export const fileParserService = new FileParserServiceImpl();

// 默认导出
export default fileParserService;