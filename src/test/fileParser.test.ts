/**
 * 文件解析服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileParserServiceImpl, FileParseError } from '../services/fileParserService';

// 模拟File对象的text方法
class MockFile extends File {
  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, name, options);
  }

  async text(): Promise<string> {
    const buffer = await this.arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    // 简单实现：将字符串转换为ArrayBuffer
    const content = (this as any)._content || '';
    const encoder = new TextEncoder();
    return encoder.encode(content).buffer;
  }
}

// 创建模拟文件的辅助函数
function createMockFile(content: string, name: string, type?: string): File {
  const file = new MockFile([content], name, { type });
  (file as any)._content = content;
  return file;
}

describe('FileParserService', () => {
  let service: FileParserServiceImpl;

  beforeEach(() => {
    service = new FileParserServiceImpl();
  });

  describe('detectFileType', () => {
    it('应该正确检测PDF文件类型', () => {
      const file = createMockFile('', 'test.pdf', 'application/pdf');
      expect(service.detectFileType(file)).toBe('PDF');
    });

    it('应该正确检测Word文件类型', () => {
      const docFile = createMockFile('', 'test.doc', 'application/msword');
      const docxFile = createMockFile('', 'test.docx', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      
      expect(service.detectFileType(docFile)).toBe('Word');
      expect(service.detectFileType(docxFile)).toBe('Word');
    });

    it('应该正确检测Markdown文件类型', () => {
      const mdFile = createMockFile('', 'test.md', 'text/markdown');
      const markdownFile = createMockFile('', 'test.markdown', 'text/plain');
      
      expect(service.detectFileType(mdFile)).toBe('Markdown');
      expect(service.detectFileType(markdownFile)).toBe('Markdown');
    });

    it('应该正确检测文本文件类型', () => {
      const txtFile = createMockFile('', 'test.txt', 'text/plain');
      expect(service.detectFileType(txtFile)).toBe('Text');
    });

    it('应该将未知类型默认为文本', () => {
      const unknownFile = createMockFile('', 'test.unknown', 'application/unknown');
      expect(service.detectFileType(unknownFile)).toBe('Text');
    });
  });

  describe('parseText', () => {
    it('应该成功解析纯文本文件', async () => {
      const content = '这是一个测试文本文件\n包含多行内容\n用于测试解析功能';
      const file = createMockFile(content, 'test.txt', 'text/plain');
      
      const result = await service.parseText(file);
      
      expect(result.content).toBe('这是一个测试文本文件 包含多行内容 用于测试解析功能');
      expect(result.fileName).toBe('test.txt');
      expect(result.fileType).toBe('Text');
      expect(result.fileSize).toBe(file.size);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.extractedAt).toBeTypeOf('number');
    });

    it('应该正确处理空文本文件', async () => {
      const file = createMockFile('', 'empty.txt', 'text/plain');
      
      const result = await service.parseText(file);
      
      expect(result.content).toBe('');
      expect(result.wordCount).toBe(0);
    });

    it('应该正确清理多余的空白字符', async () => {
      const content = '  这是   一个  \n\n  测试   \n\n\n  文本  ';
      const file = createMockFile(content, 'test.txt', 'text/plain');
      
      const result = await service.parseText(file);
      
      expect(result.content).toBe('这是 一个 测试 文本');
    });
  });

  describe('parseMarkdown', () => {
    it('应该成功解析Markdown文件', async () => {
      const content = '# 标题\n\n这是一个**粗体**文本\n\n- 列表项1\n- 列表项2';
      const file = createMockFile(content, 'test.md', 'text/markdown');
      
      const result = await service.parseMarkdown(file);
      
      expect(result.content).toContain('标题');
      expect(result.content).toContain('粗体');
      expect(result.content).toContain('列表项');
      expect(result.fileName).toBe('test.md');
      expect(result.fileType).toBe('Markdown');
    });
  });

  describe('parseFile', () => {
    it('应该根据文件类型调用正确的解析方法', async () => {
      const txtContent = '这是文本内容';
      const txtFile = createMockFile(txtContent, 'test.txt', 'text/plain');
      
      const result = await service.parseFile(txtFile);
      
      expect(result.fileType).toBe('Text');
      expect(result.content).toBe(txtContent);
    });

    it('应该为不支持的文件类型抛出错误', async () => {
      // 创建一个模拟的不支持文件类型
      const testService = new FileParserServiceImpl();
      const _originalDetectFileType = testService.detectFileType;
      testService.detectFileType = () => 'UnsupportedType';
      
      const file = createMockFile('', 'test.unknown', 'application/unknown');
      
      await expect(testService.parseFile(file)).rejects.toThrow(FileParseError);
    });
  });

  describe('字数统计', () => {
    it('应该正确统计中文字符数', async () => {
      const content = '这是中文测试内容';
      const file = createMockFile(content, 'test.txt', 'text/plain');
      
      const result = await service.parseText(file);
      
      expect(result.wordCount).toBe(8); // 8个中文字符
    });

    it('应该正确统计英文单词数', async () => {
      const content = 'This is English test content';
      const file = createMockFile(content, 'test.txt', 'text/plain');
      
      const result = await service.parseText(file);
      
      expect(result.wordCount).toBe(5); // 5个英文单词
    });

    it('应该正确统计中英文混合内容', async () => {
      const content = '这是 mixed 内容 with English words';
      const file = createMockFile(content, 'test.txt', 'text/plain');
      
      const result = await service.parseText(file);
      
      expect(result.wordCount).toBe(8); // 4个中文字符 + 4个英文单词
    });
  });
});