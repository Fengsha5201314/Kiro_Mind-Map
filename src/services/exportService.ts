/**
 * 思维导图导出服务
 * 支持多种格式导出：Markdown、FreeMind(.mm)、OPML、SVG、PNG、HTML
 */

import { MindMapData, MindMapNode } from '../types/mindmap';
import html2canvas from 'html2canvas';

/**
 * 导出错误类
 */
export class ExportError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
  }
}

/**
 * 导出格式类型
 */
export type ExportFormat = 
  | 'markdown'   // Markdown 格式 (.md)
  | 'freemind'   // FreeMind 格式 (.mm)
  | 'opml'       // OPML 格式 (.opml)
  | 'json'       // JSON 格式 (.json)
  | 'svg'        // SVG 图片 (.svg)
  | 'png'        // PNG 图片 (.png)
  | 'html';      // 交互式 HTML (.html)

/**
 * 导出格式信息
 */
export const EXPORT_FORMATS = [
  {
    id: 'markdown' as ExportFormat,
    name: 'Markdown',
    extension: '.md',
    description: '通用文本格式，可在任何编辑器中打开',
    category: 'source',
    compatible: ['XMind', 'Typora', 'Notion', 'Obsidian']
  },
  {
    id: 'freemind' as ExportFormat,
    name: 'FreeMind',
    extension: '.mm',
    description: '开源标准格式，兼容性最好',
    category: 'source',
    compatible: ['XMind', 'MindManager', 'WPS', '亿图脑图', '幕布']
  },
  {
    id: 'opml' as ExportFormat,
    name: 'OPML',
    extension: '.opml',
    description: '通用大纲格式，适合跨软件迁移',
    category: 'source',
    compatible: ['XMind', 'MindManager', '幕布', 'OmniOutliner']
  },
  {
    id: 'json' as ExportFormat,
    name: 'JSON',
    extension: '.json',
    description: '原始数据格式，可用于备份和恢复',
    category: 'data',
    compatible: ['本应用']
  },
  {
    id: 'svg' as ExportFormat,
    name: 'SVG 矢量图',
    extension: '.svg',
    description: '矢量图片，可无损缩放',
    category: 'image',
    compatible: ['浏览器', 'Illustrator', 'Figma']
  },
  {
    id: 'png' as ExportFormat,
    name: 'PNG 图片',
    extension: '.png',
    description: '通用图片格式，适合分享',
    category: 'image',
    compatible: ['所有图片查看器']
  },
  {
    id: 'html' as ExportFormat,
    name: '交互式 HTML',
    extension: '.html',
    description: '可在浏览器中交互查看的网页',
    category: 'interactive',
    compatible: ['所有浏览器']
  }
];

/**
 * 导出服务类
 */
export class ExportService {
  
  /**
   * 导出思维导图为指定格式
   */
  async export(data: MindMapData, format: ExportFormat): Promise<Blob> {
    switch (format) {
      case 'markdown':
        return this.createMarkdownBlob(data);
      case 'freemind':
        return this.exportToFreeMind(data);
      case 'opml':
        return this.exportToOPML(data);
      case 'json':
        return this.createJSONBlob(data);
      case 'svg':
        return this.exportToSVGBlob(data);
      case 'png':
        return this.exportToPNGBlob(data);
      case 'html':
        return this.exportToHTMLBlob(data);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 下载文件
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出为 Markdown 格式（内部使用）
   */
  private createMarkdownBlob(data: MindMapData): Blob {
    const markdown = this.convertToMarkdown(data);
    return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  }

  /**
   * 将思维导图数据转换为 Markdown
   */
  convertToMarkdown(data: MindMapData): string {
    const lines: string[] = [];
    
    // 添加标题
    lines.push(`# ${data.title}`);
    lines.push('');
    
    // 找到根节点
    const rootNodes = data.nodes.filter(n => n.level === 0);
    
    // 递归生成 Markdown
    const generateMarkdown = (node: MindMapNode, level: number): void => {
      const prefix = '#'.repeat(Math.min(level + 1, 6)) + ' ';
      lines.push(prefix + node.content);
      
      // 获取子节点
      const children = data.nodes.filter(n => n.parentId === node.id);
      children.forEach(child => {
        generateMarkdown(child, level + 1);
      });
    };
    
    rootNodes.forEach(root => {
      generateMarkdown(root, 1);
    });
    
    return lines.join('\n');
  }


  /**
   * 导出为 FreeMind (.mm) 格式
   * FreeMind 是开源标准，几乎所有思维导图软件都支持
   */
  private exportToFreeMind(data: MindMapData): Blob {
    const xml = this.convertToFreeMindXML(data);
    return new Blob([xml], { type: 'application/xml;charset=utf-8' });
  }

  /**
   * 将思维导图数据转换为 FreeMind XML
   */
  private convertToFreeMindXML(data: MindMapData): string {
    const escapeXml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const generateNode = (node: MindMapNode, position?: 'left' | 'right'): string => {
      const children = data.nodes.filter(n => n.parentId === node.id);
      const posAttr = position ? ` POSITION="${position}"` : '';
      
      if (children.length === 0) {
        return `<node TEXT="${escapeXml(node.content)}"${posAttr}/>`;
      }
      
      const childrenXml = children.map((child, index) => {
        // 根节点的子节点交替分布在左右两侧
        const childPos = node.level === 0 
          ? (index % 2 === 0 ? 'right' : 'left')
          : undefined;
        return generateNode(child, childPos);
      }).join('\n');
      
      return `<node TEXT="${escapeXml(node.content)}"${posAttr}>
${childrenXml}
</node>`;
    };

    const rootNode = data.nodes.find(n => n.level === 0);
    if (!rootNode) {
      return '<?xml version="1.0" encoding="UTF-8"?><map version="1.0.1"></map>';
    }

    const rootXml = generateNode(rootNode);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.0.1">
${rootXml}
</map>`;
  }

  /**
   * 导出为 OPML 格式
   * OPML 是通用的大纲格式，兼容性很好
   */
  private exportToOPML(data: MindMapData): Blob {
    const xml = this.convertToOPML(data);
    return new Blob([xml], { type: 'application/xml;charset=utf-8' });
  }

  /**
   * 将思维导图数据转换为 OPML
   */
  private convertToOPML(data: MindMapData): string {
    const escapeXml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const generateOutline = (node: MindMapNode): string => {
      const children = data.nodes.filter(n => n.parentId === node.id);
      
      if (children.length === 0) {
        return `<outline text="${escapeXml(node.content)}"/>`;
      }
      
      const childrenXml = children.map(child => generateOutline(child)).join('\n');
      
      return `<outline text="${escapeXml(node.content)}">
${childrenXml}
</outline>`;
    };

    const rootNode = data.nodes.find(n => n.level === 0);
    const bodyContent = rootNode ? generateOutline(rootNode) : '';
    const now = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(data.title)}</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
  </head>
  <body>
${bodyContent}
  </body>
</opml>`;
  }

  /**
   * 导出为 JSON 格式（内部使用）
   */
  private createJSONBlob(data: MindMapData): Blob {
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json;charset=utf-8' });
  }

  /**
   * 导出为 SVG 格式（内部使用）
   */
  private async exportToSVGBlob(_data: MindMapData): Promise<Blob> {
    // 获取当前渲染的 SVG 元素
    const svgElement = document.querySelector('.markmap svg') as SVGElement;
    if (!svgElement) {
      // 如果没有 markmap，尝试获取 ReactFlow 的 SVG
      const reactFlowSvg = document.querySelector('.react-flow svg') as SVGElement;
      if (reactFlowSvg) {
        const svgData = new XMLSerializer().serializeToString(reactFlowSvg);
        return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      }
      throw new Error('未找到可导出的思维导图');
    }
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  }

  /**
   * 导出为 PNG 格式（内部使用）
   */
  private async exportToPNGBlob(data: MindMapData): Promise<Blob> {
    const svgBlob = await this.exportToSVGBlob(data);
    const svgUrl = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // 2倍分辨率
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(blob => {
          URL.revokeObjectURL(svgUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('PNG 导出失败'));
          }
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('SVG 加载失败'));
      };
      img.src = svgUrl;
    });
  }

  /**
   * 导出为交互式 HTML（内部使用）
   */
  private exportToHTMLBlob(data: MindMapData): Blob {
    const markdown = this.convertToMarkdown(data);
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - 思维导图</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #mindmap { width: 100%; height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/markmap-view/dist/style.css">
</head>
<body>
  <svg id="mindmap"></svg>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib"></script>
  <script>
    const markdown = ${JSON.stringify(markdown)};
    const { Transformer } = markmap;
    const transformer = new Transformer();
    const { root } = transformer.transform(markdown);
    const { Markmap } = markmap;
    Markmap.create('#mindmap', null, root);
  </script>
</body>
</html>`;
    
    return new Blob([html], { type: 'text/html;charset=utf-8' });
  }
  /**
   * 导出画布为 PNG（旧 API 兼容）
   */
  async exportToPNG(element: HTMLElement, filename: string): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      canvas.toBlob(blob => {
        if (blob) {
          this.downloadFile(blob, filename);
        } else {
          throw new ExportError('PNG 导出失败', 'PNG_EXPORT_FAILED');
        }
      }, 'image/png');
    } catch (error) {
      throw new ExportError(
        error instanceof Error ? error.message : 'PNG 导出失败',
        'PNG_EXPORT_FAILED'
      );
    }
  }

  /**
   * 导出为 JSON（旧 API 兼容）
   */
  async exportToJSON(data: MindMapData, filename: string): Promise<void> {
    const blob = this.createJSONBlob(data);
    this.downloadFile(blob, filename);
  }

  /**
   * 导出为 Markdown（旧 API 兼容）
   */
  async exportToMarkdown(data: MindMapData, filename: string): Promise<void> {
    const blob = this.createMarkdownBlob(data);
    this.downloadFile(blob, filename);
  }
}

// 导出服务实例
export const exportService = new ExportService();
