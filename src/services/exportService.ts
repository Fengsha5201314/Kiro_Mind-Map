/**
 * 导出服务 - 实现思维导图的多格式导出功能
 */

import html2canvas from 'html2canvas';
import { MindMapData, MindMapNode } from '../types/mindmap';

// 导出错误类
export class ExportError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ExportError';
  }
}

// 导出服务接口
export interface ExportService {
  exportToPNG(canvas: HTMLElement, filename: string): Promise<void>;
  exportToJSON(data: MindMapData, filename: string): Promise<void>;
  exportToMarkdown(data: MindMapData, filename: string): Promise<void>;
}

// 导出服务实现
export class ExportServiceImpl implements ExportService {
  /**
   * 导出为PNG图片
   * @param canvas 画布DOM元素
   * @param filename 文件名
   */
  async exportToPNG(canvas: HTMLElement, filename: string): Promise<void> {
    try {
      if (!canvas) {
        throw new ExportError('画布元素不存在', 'CANVAS_NOT_FOUND');
      }

      // 使用html2canvas截取画布内容
      const canvasElement = await html2canvas(canvas, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高图片质量
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvas.scrollWidth,
        height: canvas.scrollHeight
      });

      // 转换为blob并下载
      canvasElement.toBlob((blob) => {
        if (!blob) {
          throw new ExportError('生成图片失败', 'CANVAS_TO_BLOB_FAILED');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 0.95);

    } catch (error) {
      if (error instanceof ExportError) {
        throw error;
      }
      throw new ExportError(`PNG导出失败: ${error instanceof Error ? error.message : '未知错误'}`, 'PNG_EXPORT_FAILED');
    }
  }

  /**
   * 导出为JSON文件
   * @param data 思维导图数据
   * @param filename 文件名
   */
  async exportToJSON(data: MindMapData, filename: string): Promise<void> {
    try {
      if (!data) {
        throw new ExportError('思维导图数据不存在', 'DATA_NOT_FOUND');
      }

      // 序列化数据
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      if (error instanceof ExportError) {
        throw error;
      }
      throw new ExportError(`JSON导出失败: ${error instanceof Error ? error.message : '未知错误'}`, 'JSON_EXPORT_FAILED');
    }
  }

  /**
   * 导出为Markdown文件
   * @param data 思维导图数据
   * @param filename 文件名
   */
  async exportToMarkdown(data: MindMapData, filename: string): Promise<void> {
    try {
      if (!data) {
        throw new ExportError('思维导图数据不存在', 'DATA_NOT_FOUND');
      }

      // 构建节点映射
      const nodeMap = new Map<string, MindMapNode>();
      data.nodes.forEach(node => {
        nodeMap.set(node.id, node);
      });

      // 找到根节点
      const rootNodes = data.nodes.filter(node => node.parentId === null);
      if (rootNodes.length === 0) {
        throw new ExportError('未找到根节点', 'ROOT_NODE_NOT_FOUND');
      }

      // 生成Markdown内容
      let markdown = `# ${data.title}\n\n`;
      
      // 添加元数据信息
      if (data.metadata) {
        markdown += `> 创建时间: ${new Date(data.createdAt).toLocaleString('zh-CN')}\n`;
        markdown += `> 更新时间: ${new Date(data.updatedAt).toLocaleString('zh-CN')}\n`;
        if (data.metadata.sourceType) {
          markdown += `> 来源类型: ${data.metadata.sourceType}\n`;
        }
        if (data.metadata.sourceFileName) {
          markdown += `> 源文件: ${data.metadata.sourceFileName}\n`;
        }
        markdown += '\n';
      }

      // 递归生成节点内容
      const generateNodeMarkdown = (node: MindMapNode, level: number = 0): string => {
        let result = '';
        
        // 生成当前节点的Markdown
        if (level === 0) {
          // 根节点使用二级标题
          result += `## ${node.content}\n\n`;
        } else {
          // 子节点使用缩进和列表
          const indent = '  '.repeat(level - 1);
          result += `${indent}- ${node.content}\n`;
        }

        // 递归处理子节点
        const children = node.children
          .map(childId => nodeMap.get(childId))
          .filter((child): child is MindMapNode => child !== undefined)
          .sort((a, b) => a.level - b.level); // 按层级排序

        children.forEach(child => {
          result += generateNodeMarkdown(child, level + 1);
        });

        return result;
      };

      // 生成所有根节点的内容
      rootNodes.forEach(rootNode => {
        markdown += generateNodeMarkdown(rootNode);
        markdown += '\n';
      });

      // 添加统计信息
      markdown += `---\n\n`;
      markdown += `**统计信息:**\n`;
      markdown += `- 总节点数: ${data.nodes.length}\n`;
      markdown += `- 最大层级: ${Math.max(...data.nodes.map(n => n.level))}\n`;
      
      // 创建下载
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      if (error instanceof ExportError) {
        throw error;
      }
      throw new ExportError(`Markdown导出失败: ${error instanceof Error ? error.message : '未知错误'}`, 'MARKDOWN_EXPORT_FAILED');
    }
  }
}

// 导出服务单例
export const exportService = new ExportServiceImpl();