/**
 * 思维导图导出服务
 * 支持多种格式导出：Markdown、FreeMind(.mm)、OPML、SVG、PNG、HTML
 */

import { MindMapData, MindMapNode } from '../types/mindmap';
import { ThemeColors } from '../types/theme';

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
  | 'xmind'      // XMind 格式 (.xmind)
  | 'txt'        // 纯文本大纲 (.txt)
  | 'json'       // JSON 格式 (.json)
  | 'svg'        // SVG 图片 (.svg)
  | 'png'        // PNG 图片 (.png)
  | 'html';      // 交互式 HTML (.html)

/**
 * 导出样式类型
 */
export type ExportStyle = 
  | 'theme'      // 使用当前主题配色（与页面一致）
  | 'simple'     // 简洁样式（固定配色）
  | 'colorful'   // 彩虹渐变样式
  | 'dark'       // 深色模式
  | 'light';     // 浅色模式

/**
 * 导出样式配置
 */
export const EXPORT_STYLES = [
  {
    id: 'theme' as ExportStyle,
    name: '当前主题',
    description: '与页面显示完全一致的配色和样式',
    preview: ['#0A0908', '#22333B', '#5E503F', '#C6AC8E']
  },
  {
    id: 'simple' as ExportStyle,
    name: '经典商务',
    description: '专业简洁，适合正式场合',
    preview: ['#2E4053', '#5D6D7E', '#AAB7B8', '#F1C40F']
  },
  {
    id: 'colorful' as ExportStyle,
    name: '活力渐变',
    description: '多彩层次，视觉丰富',
    preview: ['#4A235A', '#6C3483', '#A569BD', '#E8DAEF']
  },
  {
    id: 'dark' as ExportStyle,
    name: '暗夜精英',
    description: '高端暗黑，商务首选',
    preview: ['#1E1E1E', '#2E4053', '#333333', '#F1C40F']
  },
  {
    id: 'light' as ExportStyle,
    name: '清新淡雅',
    description: '柔和舒适，护眼清新',
    preview: ['#1A5276', '#85C1E9', '#D4E6F1', '#EBF5FB']
  }
];

/**
 * 节点位置信息（用于与页面一致的导出）
 */
export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  style?: ExportStyle;
  theme?: ThemeColors;
  backgroundColor?: string;
  scale?: number;
  // 传入实际的节点位置（用于"当前主题"样式，与页面完全一致）
  nodePositions?: NodePosition[];
}

/**
 * 导出格式信息
 */
export const EXPORT_FORMATS = [
  {
    id: 'freemind' as ExportFormat,
    name: 'FreeMind',
    extension: '.mm',
    description: '开源标准格式，兼容性最好（推荐）',
    category: 'source',
    compatible: ['XMind', 'MindManager', 'WPS', '亿图脑图', '幕布', 'MindMeister']
  },
  {
    id: 'xmind' as ExportFormat,
    name: 'XMind',
    extension: '.xmind',
    description: 'XMind 原生格式，功能完整',
    category: 'source',
    compatible: ['XMind', 'XMind Zen']
  },
  {
    id: 'opml' as ExportFormat,
    name: 'OPML',
    extension: '.opml',
    description: '通用大纲格式，适合跨软件迁移',
    category: 'source',
    compatible: ['XMind', 'MindManager', '幕布', 'OmniOutliner', 'Dynalist']
  },
  {
    id: 'markdown' as ExportFormat,
    name: 'Markdown',
    extension: '.md',
    description: '通用文本格式，可在任何编辑器中打开',
    category: 'source',
    compatible: ['Typora', 'Notion', 'Obsidian', 'VS Code']
  },
  {
    id: 'txt' as ExportFormat,
    name: '纯文本大纲',
    extension: '.txt',
    description: '简单的缩进文本格式，通用性强',
    category: 'source',
    compatible: ['所有文本编辑器', '记事本', 'Word']
  },
  {
    id: 'json' as ExportFormat,
    name: 'JSON',
    extension: '.json',
    description: '原始数据格式，可用于备份和恢复',
    category: 'data',
    compatible: ['本应用', '开发者工具']
  },
  {
    id: 'svg' as ExportFormat,
    name: 'SVG 矢量图',
    extension: '.svg',
    description: '矢量图片，可无损缩放',
    category: 'image',
    compatible: ['浏览器', 'Illustrator', 'Figma', 'Sketch']
  },
  {
    id: 'png' as ExportFormat,
    name: 'PNG 图片',
    extension: '.png',
    description: '通用图片格式，适合分享和演示',
    category: 'image',
    compatible: ['所有图片查看器', '微信', '钉钉']
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
  async export(data: MindMapData, format: ExportFormat, options?: ExportOptions): Promise<Blob> {
    switch (format) {
      case 'markdown':
        return this.createMarkdownBlob(data);
      case 'freemind':
        return this.exportToFreeMind(data);
      case 'opml':
        return this.exportToOPML(data);
      case 'xmind':
        return this.exportToXMind(data);
      case 'txt':
        return this.exportToPlainText(data);
      case 'json':
        return this.createJSONBlob(data);
      case 'svg':
        return this.exportToSVGBlob(data, options);
      case 'png':
        return this.exportToPNGBlob(data, options);
      case 'html':
        return this.exportToHTMLBlob(data);
      default:
        throw new ExportError(`不支持的导出格式: ${format}`, 'UNSUPPORTED_FORMAT');
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
   * 导出为 XMind 格式 (.xmind)
   * XMind 文件实际上是一个 ZIP 包，包含 content.json 和 manifest.json
   */
  private async exportToXMind(data: MindMapData): Promise<Blob> {
    // XMind 8+ 使用 JSON 格式
    const xmindContent = this.convertToXMindJSON(data);
    
    // 由于浏览器环境无法直接创建 ZIP，我们导出为 XMind 兼容的 JSON
    // 用户可以将其重命名为 .xmind 或导入到 XMind
    const manifest = {
      'file-entries': {
        'content.json': {},
        'metadata.json': {}
      }
    };
    
    const metadata = {
      creator: {
        name: 'AI思维导图生成器',
        version: '1.0.0'
      }
    };

    // 创建一个包含所有必要信息的 JSON 结构
    const xmindPackage = {
      content: xmindContent,
      manifest: manifest,
      metadata: metadata
    };

    return new Blob([JSON.stringify(xmindPackage, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
  }

  /**
   * 将思维导图数据转换为 XMind JSON 格式
   */
  private convertToXMindJSON(data: MindMapData): object[] {
    const generateTopic = (node: MindMapNode): object => {
      const children = data.nodes.filter(n => n.parentId === node.id);
      
      const topic: Record<string, unknown> = {
        id: node.id,
        class: node.level === 0 ? 'topic' : 'attached',
        title: node.content,
        structureClass: 'org.xmind.ui.map.unbalanced'
      };

      if (children.length > 0) {
        topic.children = {
          attached: children.map(child => generateTopic(child))
        };
      }

      return topic;
    };

    const rootNode = data.nodes.find(n => n.level === 0);
    if (!rootNode) {
      return [];
    }

    return [{
      id: data.id,
      class: 'sheet',
      title: data.title,
      rootTopic: generateTopic(rootNode),
      topicPositioning: 'fixed'
    }];
  }

  /**
   * 导出为纯文本大纲格式 (.txt)
   */
  private exportToPlainText(data: MindMapData): Blob {
    const text = this.convertToPlainText(data);
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }

  /**
   * 将思维导图数据转换为纯文本大纲
   */
  private convertToPlainText(data: MindMapData): string {
    const lines: string[] = [];
    
    // 添加标题
    lines.push(data.title);
    lines.push('='.repeat(data.title.length));
    lines.push('');
    
    // 递归生成文本大纲
    const generateText = (node: MindMapNode, indent: number): void => {
      const prefix = '  '.repeat(indent) + (indent > 0 ? '• ' : '');
      lines.push(prefix + node.content);
      
      // 获取子节点
      const children = data.nodes.filter(n => n.parentId === node.id);
      children.forEach(child => {
        generateText(child, indent + 1);
      });
    };
    
    // 找到根节点并生成
    const rootNodes = data.nodes.filter(n => n.level === 0);
    rootNodes.forEach(root => {
      generateText(root, 0);
    });
    
    return lines.join('\n');
  }

  /**
   * 导出为 JSON 格式（内部使用）
   */
  private createJSONBlob(data: MindMapData): Blob {
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json;charset=utf-8' });
  }

  /**
   * 获取节点颜色配置（根据层级和样式）
   */
  private getNodeColors(level: number, options?: ExportOptions): { bg: string; border: string; text: string } {
    const style = options?.style || 'simple';
    const theme = options?.theme;
    
    // 使用当前主题配色
    if (style === 'theme' && theme) {
      const levelIndex = Math.min(level, theme.levels.length - 1);
      const levelColors = theme.levels[levelIndex];
      return {
        bg: levelColors.backgroundColor,
        border: levelColors.borderColor,
        text: levelColors.textColor
      };
    }
    
    // 经典商务样式 - 海军蓝金配色
    if (style === 'simple') {
      const colors = [
        { bg: '#2E4053', border: '#1B2631', text: '#F1C40F' }, // 根节点 - 深蓝金字
        { bg: '#5D6D7E', border: '#2E4053', text: '#F1C40F' }, // 一级 - 中蓝金字
        { bg: '#AAB7B8', border: '#5D6D7E', text: '#2E4053' }, // 二级 - 浅灰深字
        { bg: '#D5D8DC', border: '#AAB7B8', text: '#2E4053' }, // 三级 - 更浅灰
        { bg: '#F1C40F', border: '#D5D8DC', text: '#2E4053' }, // 四级 - 金色
        { bg: '#EBF5FB', border: '#D5D8DC', text: '#2E4053' }, // 五级 - 浅蓝
      ];
      return colors[Math.min(level, colors.length - 1)];
    }
    
    // 活力渐变样式 - 紫色系渐变
    if (style === 'colorful') {
      const colors = [
        { bg: '#4A235A', border: '#6C3483', text: '#F4ECF7' }, // 深紫
        { bg: '#6C3483', border: '#A569BD', text: '#F4ECF7' }, // 中紫
        { bg: '#A569BD', border: '#E8DAEF', text: '#F4ECF7' }, // 浅紫
        { bg: '#E8DAEF', border: '#A569BD', text: '#4A235A' }, // 淡紫
        { bg: '#F4ECF7', border: '#E8DAEF', text: '#4A235A' }, // 最浅紫
        { bg: '#D7BDE2', border: '#A569BD', text: '#4A235A' }, // 粉紫
      ];
      return colors[Math.min(level, colors.length - 1)];
    }
    
    // 暗夜精英样式 - 黑金配色
    if (style === 'dark') {
      const colors = [
        { bg: '#1E1E1E', border: '#333333', text: '#F1C40F' }, // 深黑金字
        { bg: '#2E4053', border: '#1E1E1E', text: '#F1C40F' }, // 深蓝金字
        { bg: '#333333', border: '#2E4053', text: '#D5D8DC' }, // 中灰浅字
        { bg: '#595959', border: '#333333', text: '#D5D8DC' }, // 浅灰
        { bg: '#A6A6A6', border: '#595959', text: '#1E1E1E' }, // 更浅灰深字
        { bg: '#D0D0D0', border: '#A6A6A6', text: '#1E1E1E' }, // 最浅灰
      ];
      return colors[Math.min(level, colors.length - 1)];
    }
    
    // 清新淡雅样式 - 蓝色渐变
    if (style === 'light') {
      const colors = [
        { bg: '#1A5276', border: '#2980B9', text: '#FFFFFF' }, // 深蓝白字
        { bg: '#2980B9', border: '#85C1E9', text: '#FFFFFF' }, // 中蓝白字
        { bg: '#85C1E9', border: '#2980B9', text: '#1A5276' }, // 浅蓝深字
        { bg: '#D4E6F1', border: '#85C1E9', text: '#1A5276' }, // 淡蓝深字
        { bg: '#EBF5FB', border: '#D4E6F1', text: '#1A5276' }, // 最浅蓝
        { bg: '#FFFFFF', border: '#D4E6F1', text: '#1A5276' }, // 白色
      ];
      return colors[Math.min(level, colors.length - 1)];
    }
    
    // 默认返回经典商务样式
    const defaultColors = [
      { bg: '#2E4053', border: '#1B2631', text: '#F1C40F' },
      { bg: '#5D6D7E', border: '#2E4053', text: '#F1C40F' },
      { bg: '#AAB7B8', border: '#5D6D7E', text: '#2E4053' },
      { bg: '#D5D8DC', border: '#AAB7B8', text: '#2E4053' },
      { bg: '#F1C40F', border: '#D5D8DC', text: '#2E4053' },
      { bg: '#EBF5FB', border: '#D5D8DC', text: '#2E4053' },
    ];
    return defaultColors[Math.min(level, defaultColors.length - 1)];
  }
  
  /**
   * 获取背景颜色（根据样式）
   */
  private getBackgroundColor(options?: ExportOptions): string {
    const style = options?.style || 'simple';
    if (options?.backgroundColor) return options.backgroundColor;
    
    switch (style) {
      case 'dark':
        return '#0D0D0D'; // 深黑背景
      case 'light':
        return '#F8FAFC'; // 柔和白背景
      case 'colorful':
        return '#FAF5FF'; // 淡紫背景
      case 'theme':
        return '#F5F5F5'; // 中性灰背景
      default:
        return '#F8F9FA'; // 浅灰背景
    }
  }
  
  /**
   * 获取连接线颜色（根据样式）
   */
  private getEdgeColor(options?: ExportOptions): string {
    const style = options?.style || 'simple';
    const theme = options?.theme;
    
    if (style === 'theme' && theme) {
      return theme.edgeColor;
    }
    
    switch (style) {
      case 'dark':
        return '#F1C40F'; // 金色连接线
      case 'light':
        return '#5DADE2'; // 蓝色连接线
      case 'colorful':
        return '#A569BD'; // 紫色连接线
      default:
        return '#5D6D7E'; // 灰蓝连接线
    }
  }

  /**
   * 将传入的节点位置数组转换为 Map 格式
   */
  private convertNodePositionsToMap(positions: NodePosition[]): Map<string, { x: number; y: number; width: number; height: number }> {
    const map = new Map<string, { x: number; y: number; width: number; height: number }>();
    positions.forEach(pos => {
      map.set(pos.id, {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height
      });
    });
    return map;
  }

  /**
   * 计算节点布局位置（用于导出）
   */
  private calculateExportLayout(data: MindMapData): Map<string, { x: number; y: number; width: number; height: number }> {
    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
    const nodeMap = new Map<string, MindMapNode>();
    data.nodes.forEach(n => nodeMap.set(n.id, n));

    const HORIZONTAL_SPACING = 280;
    const VERTICAL_GAP = 25;
    const NODE_HEIGHT = 40;
    const CHAR_WIDTH = 12;
    const MIN_WIDTH = 100;
    const MAX_WIDTH = 300;
    const PADDING = 30;

    // 计算节点宽度
    const getNodeWidth = (content: string): number => {
      let charUnits = 0;
      for (const char of content) {
        charUnits += char.charCodeAt(0) > 127 ? 2 : 1;
      }
      const width = charUnits * (CHAR_WIDTH / 2) + PADDING;
      return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
    };

    // 获取子节点
    const getChildren = (nodeId: string): MindMapNode[] => {
      return data.nodes.filter(n => n.parentId === nodeId);
    };

    // 计算每层最大宽度
    const levelMaxWidths = new Map<number, number>();
    data.nodes.forEach(node => {
      const width = getNodeWidth(node.content);
      const currentMax = levelMaxWidths.get(node.level) || 0;
      levelMaxWidths.set(node.level, Math.max(currentMax, width));
    });

    // 计算每层X坐标
    const levelXPositions = new Map<number, number>();
    let accX = 50;
    const maxLevel = Math.max(...data.nodes.map(n => n.level));
    for (let level = 0; level <= maxLevel; level++) {
      levelXPositions.set(level, accX);
      accX += (levelMaxWidths.get(level) || MIN_WIDTH) + HORIZONTAL_SPACING;
    }

    // 计算子树高度
    const subtreeHeights = new Map<string, number>();
    const calcHeight = (nodeId: string): number => {
      const children = getChildren(nodeId);
      if (children.length === 0) {
        subtreeHeights.set(nodeId, NODE_HEIGHT);
        return NODE_HEIGHT;
      }
      let total = 0;
      children.forEach((child, i) => {
        total += calcHeight(child.id);
        if (i < children.length - 1) total += VERTICAL_GAP;
      });
      subtreeHeights.set(nodeId, total);
      return total;
    };

    const rootNode = data.nodes.find(n => n.level === 0);
    if (!rootNode) return positions;
    calcHeight(rootNode.id);

    // 分配位置
    const assignPos = (nodeId: string, x: number, yTop: number): void => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const children = getChildren(nodeId);
      const width = getNodeWidth(node.content);

      if (children.length === 0) {
        positions.set(nodeId, { x, y: yTop, width, height: NODE_HEIGHT });
        return;
      }

      const childX = levelXPositions.get(node.level + 1) || (x + HORIZONTAL_SPACING);
      let currentY = yTop;

      children.forEach((child, i) => {
        const childHeight = subtreeHeights.get(child.id) || NODE_HEIGHT;
        assignPos(child.id, childX, currentY);
        currentY += childHeight;
        if (i < children.length - 1) currentY += VERTICAL_GAP;
      });

      const firstChild = children[0];
      const lastChild = children[children.length - 1];
      const firstPos = positions.get(firstChild.id);
      const lastPos = positions.get(lastChild.id);
      const parentY = firstPos && lastPos ? (firstPos.y + lastPos.y) / 2 : yTop;

      positions.set(nodeId, { x, y: parentY, width, height: NODE_HEIGHT });
    };

    assignPos(rootNode.id, levelXPositions.get(0) || 50, 50);
    return positions;
  }

  /**
   * 导出为 SVG 格式 - 手动绘制完整的思维导图
   */
  private async exportToSVGBlob(data: MindMapData, options?: ExportOptions): Promise<Blob> {
    // 如果传入了实际节点位置（当前主题样式），使用它们；否则重新计算布局
    const positions = options?.nodePositions 
      ? this.convertNodePositionsToMap(options.nodePositions)
      : this.calculateExportLayout(data);
    const bgColor = this.getBackgroundColor(options);
    const edgeColor = this.getEdgeColor(options);
    
    // 计算画布大小
    let maxX = 0, maxY = 0;
    positions.forEach(pos => {
      maxX = Math.max(maxX, pos.x + pos.width + 50);
      maxY = Math.max(maxY, pos.y + pos.height + 50);
    });

    const width = Math.max(maxX, 800);
    const height = Math.max(maxY, 600);

    // 生成 SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .node-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <g class="edges">`;

    // 绘制连接线
    data.nodes.forEach(node => {
      if (node.parentId) {
        const parentPos = positions.get(node.parentId);
        const nodePos = positions.get(node.id);
        if (parentPos && nodePos) {
          const startX = parentPos.x + parentPos.width;
          const startY = parentPos.y + parentPos.height / 2;
          const endX = nodePos.x;
          const endY = nodePos.y + nodePos.height / 2;
          const midX = (startX + endX) / 2;
          
          svg += `
    <path d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" 
          fill="none" stroke="${edgeColor}" stroke-width="2"/>`;
        }
      }
    });

    svg += `
  </g>
  <g class="nodes">`;

    // 绘制节点
    data.nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const colors = this.getNodeColors(node.level, options);
      const radius = node.level === 0 ? 12 : node.level === 1 ? 10 : 8;
      const fontSize = node.level === 0 ? 16 : node.level === 1 ? 14 : 12;
      const fontWeight = node.level <= 1 ? 'bold' : 'normal';

      // 转义 XML 特殊字符
      const escapedContent = node.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      svg += `
    <g transform="translate(${pos.x}, ${pos.y})">
      <rect width="${pos.width}" height="${pos.height}" rx="${radius}" ry="${radius}" 
            fill="${colors.bg}" stroke="${colors.border}" stroke-width="2"/>
      <text x="${pos.width / 2}" y="${pos.height / 2 + fontSize / 3}" 
            text-anchor="middle" fill="${colors.text}" 
            font-size="${fontSize}" font-weight="${fontWeight}" class="node-text">
        ${escapedContent}
      </text>
    </g>`;
    });

    svg += `
  </g>
</svg>`;

    return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  }

  /**
   * 导出为 PNG 格式 - 使用 Canvas API 手动绘制
   */
  private async exportToPNGBlob(data: MindMapData, options?: ExportOptions): Promise<Blob> {
    // 如果传入了实际节点位置（当前主题样式），使用它们；否则重新计算布局
    const positions = options?.nodePositions 
      ? this.convertNodePositionsToMap(options.nodePositions)
      : this.calculateExportLayout(data);
    const bgColor = this.getBackgroundColor(options);
    const edgeColor = this.getEdgeColor(options);
    const scale = options?.scale || 2; // 默认2倍分辨率
    
    // 计算画布大小
    let maxX = 0, maxY = 0;
    positions.forEach(pos => {
      maxX = Math.max(maxX, pos.x + pos.width + 50);
      maxY = Math.max(maxY, pos.y + pos.height + 50);
    });

    const width = Math.max(maxX, 800);
    const height = Math.max(maxY, 600);

    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new ExportError('无法创建 Canvas 上下文', 'CANVAS_ERROR');
    }

    // 设置缩放
    ctx.scale(scale, scale);

    // 绘制背景
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 绘制连接线
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    data.nodes.forEach(node => {
      if (node.parentId) {
        const parentPos = positions.get(node.parentId);
        const nodePos = positions.get(node.id);
        if (parentPos && nodePos) {
          const startX = parentPos.x + parentPos.width;
          const startY = parentPos.y + parentPos.height / 2;
          const endX = nodePos.x;
          const endY = nodePos.y + nodePos.height / 2;
          const midX = (startX + endX) / 2;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
          ctx.stroke();
        }
      }
    });

    // 绘制节点
    data.nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const colors = this.getNodeColors(node.level, options);
      const radius = node.level === 0 ? 12 : node.level === 1 ? 10 : 8;
      const fontSize = node.level === 0 ? 16 : node.level === 1 ? 14 : 12;
      const fontWeight = node.level <= 1 ? 'bold' : 'normal';

      // 绘制圆角矩形
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      this.roundRect(ctx, pos.x, pos.y, pos.width, pos.height, radius);
      ctx.fill();
      ctx.stroke();

      // 绘制文本
      ctx.fillStyle = colors.text;
      ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 文本截断处理
      const maxTextWidth = pos.width - 20;
      let displayText = node.content;
      while (ctx.measureText(displayText).width > maxTextWidth && displayText.length > 3) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== node.content) {
        displayText = displayText.slice(0, -2) + '...';
      }
      
      ctx.fillText(displayText, pos.x + pos.width / 2, pos.y + pos.height / 2);
    });

    // 转换为 Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new ExportError('PNG 导出失败', 'PNG_EXPORT_FAILED'));
        }
      }, 'image/png', 0.95);
    });
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
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
   * 导出画布为 PNG（旧 API 兼容 - 已弃用，请使用 export 方法）
   * @deprecated 使用 export(data, 'png') 代替
   */
  async exportToPNG(_element: HTMLElement, _filename: string): Promise<void> {
    console.warn('exportToPNG 方法已弃用，请使用 export(data, "png") 方法');
    throw new ExportError('请使用新的导出 API', 'DEPRECATED_API');
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
