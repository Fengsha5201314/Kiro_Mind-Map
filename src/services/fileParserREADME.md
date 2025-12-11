# 文件解析服务

文件解析服务提供了统一的接口来解析各种格式的文档文件，提取其中的文本内容用于后续的AI处理。

## 支持的文件格式

- **PDF文件** (.pdf) - 使用 pdfjs-dist 库
- **Word文档** (.doc, .docx) - 使用 mammoth 库  
- **Markdown文件** (.md, .markdown) - 原生支持
- **纯文本文件** (.txt) - 原生支持

## 核心功能

### 1. 文件类型检测

```typescript
import { fileParserService } from '../services/fileParserService';

const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
const fileType = fileParserService.detectFileType(file); // 返回 'PDF'
```

### 2. 统一文件解析

```typescript
// 自动检测文件类型并调用相应的解析方法
const result = await fileParserService.parseFile(file);

console.log(result.content);    // 提取的文本内容
console.log(result.wordCount);  // 字数统计
console.log(result.fileType);   // 文件类型
```

### 3. 特定格式解析

```typescript
// 解析PDF文件
const pdfResult = await fileParserService.parsePDF(pdfFile);

// 解析Word文档
const wordResult = await fileParserService.parseWord(wordFile);

// 解析Markdown文件
const mdResult = await fileParserService.parseMarkdown(mdFile);

// 解析纯文本文件
const txtResult = await fileParserService.parseText(txtFile);
```

## 解析结果结构

```typescript
interface ParseResult {
  content: string;           // 提取的文本内容
  fileName: string;          // 文件名
  fileType: string;          // 文件类型
  fileSize: number;          // 文件大小（字节）
  pageCount?: number;        // 页数（PDF专用）
  wordCount: number;         // 字数
  extractedAt: number;       // 提取时间戳
}
```

## 字数统计规则

文件解析服务提供智能的字数统计功能：

- **中文字符**：按字符计算（每个汉字算1个词）
- **英文单词**：按空格分隔的单词计算
- **混合内容**：中文字符数 + 英文单词数

示例：
```typescript
"这是中文"           // 4个词（4个中文字符）
"This is English"    // 3个词（3个英文单词）  
"这是 mixed 内容"    // 5个词（4个中文字符 + 1个英文单词）
```

## 错误处理

服务使用自定义的 `FileParseError` 类来处理解析错误：

```typescript
import { FileParseError } from '../services/fileParserService';

try {
  const result = await fileParserService.parseFile(file);
} catch (error) {
  if (error instanceof FileParseError) {
    console.log(`解析失败: ${error.message}`);
    console.log(`文件名: ${error.fileName}`);
    console.log(`文件类型: ${error.fileType}`);
    console.log(`原始错误: ${error.originalError?.message}`);
  }
}
```

## 文本清理功能

解析服务会自动清理提取的文本：

- 移除多余的空白字符
- 规范化换行符
- 去除首尾空白
- 压缩连续的空格

## 性能考虑

- **文件大小限制**：建议单个文件不超过50MB
- **内存使用**：大文件会占用相应的内存空间
- **解析速度**：
  - 文本文件：几乎瞬时
  - Markdown文件：几乎瞬时  
  - PDF文件：取决于页数和复杂度
  - Word文档：取决于文档大小和格式复杂度

## 使用示例

查看 `src/examples/fileParserExample.ts` 文件获取完整的使用示例。

## 依赖库

- `pdfjs-dist`: PDF文件解析
- `mammoth`: Word文档解析

## 类型定义

服务提供完整的TypeScript类型定义，包括：

- `FileParserService`: 服务接口
- `ParseResult`: 解析结果类型
- `FileParseError`: 错误类型
- `SUPPORTED_FILE_TYPES`: 支持的文件类型常量

## 扩展性

服务设计为可扩展的架构，可以轻松添加新的文件格式支持：

1. 在 `SUPPORTED_FILE_TYPES` 中添加新的MIME类型
2. 在 `detectFileType` 方法中添加检测逻辑
3. 实现新的解析方法
4. 在 `parseFile` 方法中添加调用逻辑