/**
 * 节点懒加载Hook
 * 实现思维导图节点的懒加载功能，提升大型思维导图的性能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MindMapNode } from '../types/mindmap';

// 懒加载配置
export interface LazyLoadingConfig {
  // 初始加载的节点数量
  initialLoadCount: number;
  // 每次懒加载的节点数量
  batchSize: number;
  // 触发懒加载的滚动阈值（像素）
  scrollThreshold: number;
  // 是否启用懒加载
  enabled: boolean;
  // 预加载距离（提前加载即将进入视口的节点）
  preloadDistance: number;
}

// 默认配置
const DEFAULT_CONFIG: LazyLoadingConfig = {
  initialLoadCount: 50,
  batchSize: 25,
  scrollThreshold: 200,
  enabled: true,
  preloadDistance: 300
};

// 懒加载状态
export interface LazyLoadingState {
  // 当前已加载的节点
  loadedNodes: MindMapNode[];
  // 是否正在加载
  isLoading: boolean;
  // 是否还有更多节点可加载
  hasMore: boolean;
  // 加载进度（0-1）
  progress: number;
  // 加载统计
  stats: {
    totalNodes: number;
    loadedCount: number;
    batchesLoaded: number;
  };
}

/**
 * 节点懒加载Hook
 */
export function useLazyLoading(
  allNodes: MindMapNode[],
  config: Partial<LazyLoadingConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<LazyLoadingState>({
    loadedNodes: [],
    isLoading: false,
    hasMore: true,
    progress: 0,
    stats: {
      totalNodes: 0,
      loadedCount: 0,
      batchesLoaded: 0
    }
  });

  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLoadTimeRef = useRef<number>(0);

  // 按优先级排序节点（根节点优先，然后按层级）
  const sortNodesByPriority = useCallback((nodes: MindMapNode[]): MindMapNode[] => {
    return [...nodes].sort((a, b) => {
      // 根节点优先
      if (a.level === 0 && b.level !== 0) return -1;
      if (b.level === 0 && a.level !== 0) return 1;
      
      // 按层级排序
      if (a.level !== b.level) return a.level - b.level;
      
      // 同层级按创建时间排序
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }, []);

  // 初始化加载
  useEffect(() => {
    if (!finalConfig.enabled || allNodes.length === 0) {
      setState({
        loadedNodes: allNodes,
        isLoading: false,
        hasMore: false,
        progress: 1,
        stats: {
          totalNodes: allNodes.length,
          loadedCount: allNodes.length,
          batchesLoaded: 1
        }
      });
      return;
    }

    const sortedNodes = sortNodesByPriority(allNodes);
    const initialNodes = sortedNodes.slice(0, finalConfig.initialLoadCount);
    
    setState({
      loadedNodes: initialNodes,
      isLoading: false,
      hasMore: initialNodes.length < allNodes.length,
      progress: initialNodes.length / allNodes.length,
      stats: {
        totalNodes: allNodes.length,
        loadedCount: initialNodes.length,
        batchesLoaded: 1
      }
    });
  }, [allNodes, finalConfig.enabled, finalConfig.initialLoadCount, sortNodesByPriority]);

  // 加载更多节点
  const loadMore = useCallback(() => {
    if (!finalConfig.enabled || state.isLoading || !state.hasMore) {
      return;
    }

    // 防止频繁加载
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 100) {
      return;
    }
    lastLoadTimeRef.current = now;

    setState(prevState => ({ ...prevState, isLoading: true }));

    // 使用setTimeout模拟异步加载，避免阻塞UI
    loadingTimeoutRef.current = setTimeout(() => {
      setState(prevState => {
        const sortedNodes = sortNodesByPriority(allNodes);
        const currentCount = prevState.loadedNodes.length;
        const nextBatch = sortedNodes.slice(
          currentCount, 
          currentCount + finalConfig.batchSize
        );
        
        const newLoadedNodes = [...prevState.loadedNodes, ...nextBatch];
        const hasMore = newLoadedNodes.length < allNodes.length;
        
        return {
          loadedNodes: newLoadedNodes,
          isLoading: false,
          hasMore,
          progress: newLoadedNodes.length / allNodes.length,
          stats: {
            totalNodes: allNodes.length,
            loadedCount: newLoadedNodes.length,
            batchesLoaded: prevState.stats.batchesLoaded + 1
          }
        };
      });
    }, 50); // 50ms延迟，让UI有时间响应
  }, [allNodes, finalConfig.enabled, finalConfig.batchSize, state.isLoading, state.hasMore, sortNodesByPriority]);

  // 根据视口位置智能加载
  const loadByViewport = useCallback((
    viewportCenter: { x: number; y: number },
    _viewportSize: { width: number; height: number }
  ) => {
    if (!finalConfig.enabled || state.isLoading || !state.hasMore) {
      return;
    }

    const sortedNodes = sortNodesByPriority(allNodes);
    const unloadedNodes = sortedNodes.slice(state.loadedNodes.length);
    
    // 计算节点到视口中心的距离
    const nodesWithDistance = unloadedNodes.map(node => {
      const nodePos = node.position || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(nodePos.x - viewportCenter.x, 2) + 
        Math.pow(nodePos.y - viewportCenter.y, 2)
      );
      return { node, distance };
    });

    // 按距离排序，优先加载距离视口中心近的节点
    nodesWithDistance.sort((a, b) => a.distance - b.distance);
    
    // 加载在预加载距离内的节点
    const nodesToLoad = nodesWithDistance
      .filter(item => item.distance <= finalConfig.preloadDistance)
      .slice(0, finalConfig.batchSize)
      .map(item => item.node);

    if (nodesToLoad.length > 0) {
      setState(prevState => {
        const newLoadedNodes = [...prevState.loadedNodes, ...nodesToLoad];
        const hasMore = newLoadedNodes.length < allNodes.length;
        
        return {
          loadedNodes: newLoadedNodes,
          isLoading: false,
          hasMore,
          progress: newLoadedNodes.length / allNodes.length,
          stats: {
            totalNodes: allNodes.length,
            loadedCount: newLoadedNodes.length,
            batchesLoaded: prevState.stats.batchesLoaded + 1
          }
        };
      });
    }
  }, [allNodes, finalConfig.enabled, finalConfig.batchSize, finalConfig.preloadDistance, state.isLoading, state.hasMore, state.loadedNodes.length, sortNodesByPriority]);

  // 重置懒加载状态
  const reset = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    if (!finalConfig.enabled) {
      setState({
        loadedNodes: allNodes,
        isLoading: false,
        hasMore: false,
        progress: 1,
        stats: {
          totalNodes: allNodes.length,
          loadedCount: allNodes.length,
          batchesLoaded: 1
        }
      });
      return;
    }

    const sortedNodes = sortNodesByPriority(allNodes);
    const initialNodes = sortedNodes.slice(0, finalConfig.initialLoadCount);
    
    setState({
      loadedNodes: initialNodes,
      isLoading: false,
      hasMore: initialNodes.length < allNodes.length,
      progress: initialNodes.length / allNodes.length,
      stats: {
        totalNodes: allNodes.length,
        loadedCount: initialNodes.length,
        batchesLoaded: 1
      }
    });
  }, [allNodes, finalConfig.enabled, finalConfig.initialLoadCount, sortNodesByPriority]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    loadMore,
    loadByViewport,
    reset,
    config: finalConfig
  };
}

export default useLazyLoading;