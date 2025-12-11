/**
 * 导出服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportService, ExportError } from '../services/exportService';
import { MindMapData } from '../types/mindmap';

// 模拟html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toBlob: vi.fn((callback) => {
      const blob = new Blob(['fake image data'], { type: 'image/png' });
      callback(blob);
    })
  }))
}));

// 模拟DOM API
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// 模拟document
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn(),
      style: {}
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }
});

describe('导出服务测试', () => {
  let mockMindMapData: MindMapData;

  beforeEach(() => {
    // 重置所有模拟
    vi.clearAllMocks();

    // 创建测试用的思维导图数据
    mockMindMapData = {
      id: 'test-mindmap-1',
      title: '测试思维导图',
      nodes: [
        {
          id: 'root',
          content: '根节点',
          level: 0,
          parentId: null,
          children: ['child1', 'child2'],
          position: { x: 0, y: 0 }
        },
        {
          id: 'child1',
          content: '子节点1',
          level: 1,
          parentId: 'root',
          children: [],
          position: { x: -100, y: 100 }
        },
        {
          id: 'child2',
          content: '子节点2',
          level: 1,
          parentId: 'root',
          children: ['grandchild1'],
          position: { x: 100, y: 100 }
        },
        {
          id: 'grandchild1',
          content: '孙节点1',
          level: 2,
          parentId: 'child2',
          children: [],
          position: { x: 100, y: 200 }
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        sourceType: 'text',
        sourceFileName: 'test.txt'
      }
    };
  });

  describe('JSON导出', () => {
    it('应该能够导出JSON格式', async () => {
      await exportService.exportToJSON(mockMindMapData, 'test-mindmap');

      // 验证创建了下载链接
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('应该在数据为空时抛出错误', async () => {
      await expect(exportService.exportToJSON(null as any, 'test'))
        .rejects.toThrow(ExportError);
    });

    it('应该正确设置文件名扩展名', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {}
      };
      
      vi.mocked(document.createElement).mockReturnValue(mockLink as any);

      await exportService.exportToJSON(mockMindMapData, 'test-mindmap');

      expect(mockLink.download).toBe('test-mindmap.json');
    });
  });

  describe('Markdown导出', () => {
    it('应该能够导出Markdown格式', async () => {
      await exportService.exportToMarkdown(mockMindMapData, 'test-mindmap');

      // 验证创建了下载链接
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('应该在数据为空时抛出错误', async () => {
      await expect(exportService.exportToMarkdown(null as any, 'test'))
        .rejects.toThrow(ExportError);
    });

    it('应该正确设置文件名扩展名', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {}
      };
      
      vi.mocked(document.createElement).mockReturnValue(mockLink as any);

      await exportService.exportToMarkdown(mockMindMapData, 'test-mindmap');

      expect(mockLink.download).toBe('test-mindmap.md');
    });

    it('应该在没有根节点时抛出错误', async () => {
      const dataWithoutRoot = {
        ...mockMindMapData,
        nodes: mockMindMapData.nodes.filter(node => node.parentId !== null)
      };

      await expect(exportService.exportToMarkdown(dataWithoutRoot, 'test'))
        .rejects.toThrow(ExportError);
    });
  });

  describe('PNG导出', () => {
    it('应该能够导出PNG格式', async () => {
      const mockCanvas = document.createElement('div');
      mockCanvas.scrollWidth = 800;
      mockCanvas.scrollHeight = 600;

      await exportService.exportToPNG(mockCanvas, 'test-mindmap');

      // 验证调用了html2canvas
      const html2canvas = await import('html2canvas');
      expect(html2canvas.default).toHaveBeenCalledWith(mockCanvas, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 800,
        height: 600
      });
    });

    it('应该在画布为空时抛出错误', async () => {
      await expect(exportService.exportToPNG(null as any, 'test'))
        .rejects.toThrow(ExportError);
    });

    it('应该正确设置文件名扩展名', async () => {
      const mockCanvas = document.createElement('div');
      mockCanvas.scrollWidth = 800;
      mockCanvas.scrollHeight = 600;

      await exportService.exportToPNG(mockCanvas, 'test-mindmap');

      // PNG导出是异步的，通过toBlob回调处理
      // 这里主要验证html2canvas被正确调用
      const html2canvas = await import('html2canvas');
      expect(html2canvas.default).toHaveBeenCalled();
    });
  });
});