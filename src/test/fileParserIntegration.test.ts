/**
 * 文件解析服务集成测试
 */

import { describe, it, expect } from 'vitest';
import { fileParserService } from '../services/fileParserService';

// 创建模拟文件的辅助函数
function createMockFile(content: string, name: string, type?: string): File {
  const file = new File([content], name, { type });
  
  // 模拟text()方法
  (file as any).text = async () => content;
  
  // 模拟arrayBuffer()方法
  (file as any).arrayBuffer = async () => {
    const encoder = new TextEncoder();
    return encoder.encode(content).buffer;
  };
  
  return file;
}

describe('文件解析服务集成测试', () => {
  it('应该能够解析各种类型的文件', async () => {
    // 测试文本文件
    const txtFile = createMockFile('这是文本内容', 'test.txt', 'text/plain');
    const txtResult = await fileParserService.parseFile(txtFile);
    expect(txtResult.fileType).toBe('Text');
    expect(txtResult.content).toBe('这是文本内容');

    // 测试Markdown文件
    const mdFile = createMockFile('# 标题\n内容', 'test.md', 'text/markdown');
    const mdResult = await fileParserService.parseFile(mdFile);
    expect(mdResult.fileType).toBe('Markdown');
    expect(mdResult.content).toContain('标题');

    // 验证所有结果都有必要的字段
    [txtResult, mdResult].forEach(result => {
      expect(result.fileName).toBeTruthy();
      expect(result.fileSize).toBeGreaterThanOrEqual(0);
      expect(result.wordCount).toBeGreaterThanOrEqual(0);
      expect(result.extractedAt).toBeTypeOf('number');
    });
  });

  it('应该正确处理文件类型检测', () => {
    const pdfFile = createMockFile('', 'document.pdf', 'application/pdf');
    const docFile = createMockFile('', 'document.doc', 'application/msword');
    const txtFile = createMockFile('', 'document.txt', 'text/plain');
    const mdFile = createMockFile('', 'document.md', 'text/markdown');

    expect(fileParserService.detectFileType(pdfFile)).toBe('PDF');
    expect(fileParserService.detectFileType(docFile)).toBe('Word');
    expect(fileParserService.detectFileType(txtFile)).toBe('Text');
    expect(fileParserService.detectFileType(mdFile)).toBe('Markdown');
  });

  it('应该正确统计不同语言的字数', async () => {
    // 纯中文
    const chineseFile = createMockFile('中文测试内容', 'chinese.txt', 'text/plain');
    const chineseResult = await fileParserService.parseText(chineseFile);
    expect(chineseResult.wordCount).toBe(6);

    // 纯英文
    const englishFile = createMockFile('English test content', 'english.txt', 'text/plain');
    const englishResult = await fileParserService.parseText(englishFile);
    expect(englishResult.wordCount).toBe(3);

    // 中英混合
    const mixedFile = createMockFile('中文 English 混合', 'mixed.txt', 'text/plain');
    const mixedResult = await fileParserService.parseText(mixedFile);
    expect(mixedResult.wordCount).toBe(5); // 4个中文字符 + 1个英文单词
  });
});