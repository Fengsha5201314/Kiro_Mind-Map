/**
 * 性能优化功能测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { debounce, throttle, rafThrottle } from '../utils/performance';
import { 
  MemoryCacheService, 
  FileCacheService, 
  APICacheService 
} from '../services/cacheService';
import { VirtualizationService } from '../services/virtualizationService';
import { MindMapNode } from '../types/mindmap';

describe('性能优化功能', () => {
  describe('防抖和节流', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('防抖函数应该延迟执行', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // 快速调用多次
      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');

      // 函数还未执行
      expect(mockFn).not.toHaveBeenCalled();

      // 快进时间
      vi.advanceTimersByTime(100);

      // 只执行最后一次调用
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test3');
    });

    it('节流函数应该限制执行频率', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      // 快速调用多次
      throttledFn('test1');
      throttledFn('test2');
      throttledFn('test3');

      // 第一次立即执行
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test1');

      // 快进时间
      vi.advanceTimersByTime(100);

      // 执行最后一次调用
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('test3');
    });

    it('RAF节流函数应该使用requestAnimationFrame', () => {
      const mockFn = vi.fn();
      const mockRAF = vi.fn((callback) => {
        setTimeout(callback, 16); // 模拟RAF
        return 1;
      });
      
      // 模拟requestAnimationFrame
      global.requestAnimationFrame = mockRAF;
      global.cancelAnimationFrame = vi.fn();

      const rafThrottledFn = rafThrottle(mockFn);

      rafThrottledFn('test');
      rafThrottledFn('test2');

      expect(mockRAF).toHaveBeenCalledTimes(1);

      // 快进时间模拟RAF执行
      vi.advanceTimersByTime(16);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test2');
    });
  });

  describe('缓存服务', () => {
    let cacheService: MemoryCacheService;

    beforeEach(() => {
      vi.useFakeTimers();
      cacheService = new MemoryCacheService({
        maxSize: 1024,
        defaultTTL: 1000,
        maxItems: 10
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该能够设置和获取缓存', () => {
      const testData = { message: 'Hello World' };
      
      cacheService.set('test-key', testData);
      const retrieved = cacheService.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('应该正确处理缓存过期', () => {
      const testData = { message: 'Hello World' };
      
      cacheService.set('test-key', testData, 100); // 100ms过期
      
      // 立即获取应该成功
      expect(cacheService.get('test-key')).toEqual(testData);
      
      // 模拟时间过去
      vi.advanceTimersByTime(150);
      
      // 过期后应该返回null
      expect(cacheService.get('test-key')).toBeNull();
    });

    it('应该正确统计缓存命中率', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      // 命中
      cacheService.get('key1');
      cacheService.get('key2');
      
      // 未命中
      cacheService.get('nonexistent');
      
      const stats = cacheService.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2/3);
    });
  });

  describe('文件缓存服务', () => {
    let fileCacheService: FileCacheService;

    beforeEach(() => {
      fileCacheService = new FileCacheService();
    });

    it('应该能够缓存文件内容', () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
        lastModified: Date.now()
      });
      
      const content = 'This is test content';
      
      fileCacheService.cacheFileContent(mockFile, content);
      const retrieved = fileCacheService.getFileContent(mockFile);
      
      expect(retrieved).toBe(content);
    });

    it('应该检测文件是否已缓存', () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
        lastModified: Date.now()
      });
      
      expect(fileCacheService.isFileCached(mockFile)).toBe(false);
      
      fileCacheService.cacheFileContent(mockFile, 'content');
      
      expect(fileCacheService.isFileCached(mockFile)).toBe(true);
    });
  });

  describe('API缓存服务', () => {
    let apiCacheService: APICacheService;

    beforeEach(() => {
      apiCacheService = new APICacheService();
    });

    it('应该能够缓存API响应', () => {
      const endpoint = '/api/generate';
      const params = { content: 'test' };
      const response = { result: 'success' };
      
      apiCacheService.cacheAPIResponse(endpoint, params, response);
      const retrieved = apiCacheService.getAPIResponse(endpoint, params);
      
      expect(retrieved).toEqual(response);
    });

    it('应该检测API响应是否已缓存', () => {
      const endpoint = '/api/generate';
      const params = { content: 'test' };
      
      expect(apiCacheService.isAPICached(endpoint, params)).toBe(false);
      
      apiCacheService.cacheAPIResponse(endpoint, params, { result: 'success' });
      
      expect(apiCacheService.isAPICached(endpoint, params)).toBe(true);
    });

    it('应该能够清除特定端点的缓存', () => {
      const endpoint = '/api/generate';
      
      apiCacheService.cacheAPIResponse(endpoint, { param1: 'value1' }, { result: '1' });
      apiCacheService.cacheAPIResponse(endpoint, { param2: 'value2' }, { result: '2' });
      apiCacheService.cacheAPIResponse('/api/other', { param: 'value' }, { result: '3' });
      
      expect(apiCacheService.size()).toBe(3);
      
      apiCacheService.clearEndpointCache(endpoint);
      
      expect(apiCacheService.size()).toBe(1);
      expect(apiCacheService.isAPICached('/api/other', { param: 'value' })).toBe(true);
    });
  });

  describe('虚拟化渲染服务', () => {
    let virtualizationService: VirtualizationService;
    let mockNodes: MindMapNode[];

    beforeEach(() => {
      virtualizationService = new VirtualizationService({
        minNodesForVirtualization: 5,
        viewportPadding: 100
      });

      // 创建测试节点
      mockNodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        content: `Node ${i}`,
        level: Math.floor(i / 3),
        parentId: i === 0 ? null : `node-${Math.floor((i - 1) / 3)}`,
        children: [],
        position: { x: i * 100, y: Math.floor(i / 3) * 100 }
      }));
    });

    it('应该启用虚拟化当节点数量超过阈值', () => {
      const viewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1
      };

      const result = virtualizationService.virtualize(mockNodes, viewport);
      
      expect(result.virtualizationEnabled).toBe(true);
      expect(result.totalNodes).toBe(10);
      expect(result.visibleNodes.length).toBeLessThanOrEqual(10);
    });

    it('应该不启用虚拟化当节点数量较少', () => {
      const smallNodeSet = mockNodes.slice(0, 3);
      const viewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1
      };

      const result = virtualizationService.virtualize(smallNodeSet, viewport);
      
      expect(result.virtualizationEnabled).toBe(false);
      expect(result.visibleNodes.length).toBe(3);
    });

    it('应该正确计算视口信息', () => {
      const transform: [number, number, number] = [-100, -50, 2];
      const dimensions = { width: 800, height: 600 };

      const viewport = virtualizationService.calculateViewport(transform, dimensions);
      
      expect(viewport.x).toBe(50); // -(-100) / 2
      expect(viewport.y).toBe(25); // -(-50) / 2
      expect(viewport.width).toBe(400); // 800 / 2
      expect(viewport.height).toBe(300); // 600 / 2
      expect(viewport.zoom).toBe(2);
    });

    it('应该提供性能统计信息', () => {
      const viewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1
      };

      const result = virtualizationService.virtualize(mockNodes, viewport);
      const stats = virtualizationService.getPerformanceStats(result);
      
      expect(stats).toContain('虚拟化渲染统计');
      expect(stats).toContain(`总节点数: ${result.totalNodes}`);
      expect(stats).toContain(`可见节点: ${result.visibleNodes.length}`);
    });
  });
});