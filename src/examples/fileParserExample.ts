/**
 * 文件解析服务使用示例
 */

import { fileParserService, FileParseError } from '../services/fileParserService';

/**
 * 演示如何使用文件解析服务
 */
export async function demonstrateFileParser() {
  console.log('=== 文件解析服务演示 ===\n');

  try {
    // 示例1：解析文本文件
    console.log('1. 解析文本文件：');
    const textContent = '这是一个示例文本文件\n包含多行内容\n用于演示文件解析功能';
    const textFile = new File([textContent], 'example.txt', { type: 'text/plain' });
    
    const textResult = await fileParserService.parseText(textFile);
    console.log(`  文件名: ${textResult.fileName}`);
    console.log(`  文件类型: ${textResult.fileType}`);
    console.log(`  文件大小: ${textResult.fileSize} 字节`);
    console.log(`  字数: ${textResult.wordCount}`);
    console.log(`  内容预览: ${textResult.content.substring(0, 50)}...`);
    console.log();

    // 示例2：解析Markdown文件
    console.log('2. 解析Markdown文件：');
    const markdownContent = `# 示例标题

这是一个**Markdown**文件示例。

## 功能特性

- 支持标题
- 支持**粗体**和*斜体*
- 支持列表

### 代码示例

\`\`\`javascript
console.log('Hello, World!');
\`\`\``;

    const markdownFile = new File([markdownContent], 'example.md', { type: 'text/markdown' });
    const markdownResult = await fileParserService.parseMarkdown(markdownFile);
    
    console.log(`  文件名: ${markdownResult.fileName}`);
    console.log(`  文件类型: ${markdownResult.fileType}`);
    console.log(`  字数: ${markdownResult.wordCount}`);
    console.log(`  内容预览: ${markdownResult.content.substring(0, 100)}...`);
    console.log();

    // 示例3：文件类型检测
    console.log('3. 文件类型检测：');
    const files = [
      new File([''], 'document.pdf', { type: 'application/pdf' }),
      new File([''], 'document.doc', { type: 'application/msword' }),
      new File([''], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      new File([''], 'readme.md', { type: 'text/markdown' }),
      new File([''], 'notes.txt', { type: 'text/plain' }),
      new File([''], 'unknown.xyz', { type: 'application/unknown' })
    ];

    files.forEach(file => {
      const detectedType = fileParserService.detectFileType(file);
      console.log(`  ${file.name} -> ${detectedType}`);
    });
    console.log();

    // 示例4：统一文件解析接口
    console.log('4. 使用统一接口解析不同类型文件：');
    const testFiles = [
      new File([textContent], 'test.txt', { type: 'text/plain' }),
      new File([markdownContent], 'test.md', { type: 'text/markdown' })
    ];

    for (const file of testFiles) {
      try {
        const result = await fileParserService.parseFile(file);
        console.log(`  ${result.fileName} (${result.fileType}): ${result.wordCount} 个词`);
      } catch (error) {
        if (error instanceof FileParseError) {
          console.log(`  解析 ${error.fileName} 失败: ${error.message}`);
        }
      }
    }
    console.log();

    // 示例5：字数统计演示
    console.log('5. 字数统计演示：');
    const testTexts = [
      '纯中文内容测试',
      'Pure English content test',
      '中英文 mixed content 测试',
      '包含数字123和符号！@#的内容',
      ''
    ];

    for (const text of testTexts) {
      const file = new File([text], 'test.txt', { type: 'text/plain' });
      const result = await fileParserService.parseText(file);
      console.log(`  "${text}" -> ${result.wordCount} 个词`);
    }

  } catch (error) {
    console.error('演示过程中发生错误:', error);
  }
}

/**
 * 演示错误处理
 */
export async function demonstrateErrorHandling() {
  console.log('\n=== 错误处理演示 ===\n');

  try {
    // 模拟解析失败的情况
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    
    // 模拟text()方法抛出错误
    (invalidFile as any).text = async () => {
      throw new Error('模拟的文件读取错误');
    };

    await fileParserService.parseText(invalidFile);
  } catch (error) {
    if (error instanceof FileParseError) {
      console.log('捕获到文件解析错误:');
      console.log(`  错误消息: ${error.message}`);
      console.log(`  文件名: ${error.fileName}`);
      console.log(`  文件类型: ${error.fileType}`);
      console.log(`  原始错误: ${error.originalError?.message}`);
    }
  }
}

// 如果直接运行此文件，执行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateFileParser().then(() => {
    return demonstrateErrorHandling();
  });
}