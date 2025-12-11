/**
 * 防抖搜索Hook
 * 为搜索输入提供防抖功能，优化搜索性能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce, smartDebounce } from '../utils/performance';

// 搜索配置
export interface SearchConfig {
  // 防抖延迟（毫秒）
  delay: number;
  // 最小搜索长度
  minLength: number;
  // 是否启用智能防抖（根据输入频率调整延迟）
  smartDebounce: boolean;
  // 智能防抖的最小延迟
  minDelay: number;
  // 智能防抖的最大延迟
  maxDelay: number;
  // 是否自动清理空白字符
  trimWhitespace: boolean;
  // 是否启用搜索历史
  enableHistory: boolean;
  // 搜索历史最大条数
  maxHistoryItems: number;
}

// 搜索状态
export interface SearchState {
  // 当前搜索词
  query: string;
  // 防抖后的搜索词
  debouncedQuery: string;
  // 是否正在搜索
  isSearching: boolean;
  // 搜索历史
  history: string[];
  // 搜索统计
  stats: {
    totalSearches: number;
    lastSearchTime: number;
    averageDelay: number;
  };
}

// 默认配置
const DEFAULT_CONFIG: SearchConfig = {
  delay: 300,
  minLength: 1,
  smartDebounce: false,
  minDelay: 100,
  maxDelay: 1000,
  trimWhitespace: true,
  enableHistory: true,
  maxHistoryItems: 10
};

/**
 * 防抖搜索Hook
 */
export function useDebounceSearch(
  onSearch: (query: string) => void | Promise<void>,
  config: Partial<SearchConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<SearchState>({
    query: '',
    debouncedQuery: '',
    isSearching: false,
    history: [],
    stats: {
      totalSearches: 0,
      lastSearchTime: 0,
      averageDelay: finalConfig.delay
    }
  });

  const searchStartTimeRef = useRef<number>(0);
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | ReturnType<typeof smartDebounce>>();

  // 创建防抖搜索函数
  useEffect(() => {
    const performSearch = async (query: string) => {
      const startTime = performance.now();
      searchStartTimeRef.current = startTime;
      
      setState(prev => ({ ...prev, isSearching: true }));
      
      try {
        await onSearch(query);
        
        // 更新统计信息
        const endTime = performance.now();
        const searchTime = endTime - startTime;
        
        setState(prev => ({
          ...prev,
          isSearching: false,
          debouncedQuery: query,
          stats: {
            totalSearches: prev.stats.totalSearches + 1,
            lastSearchTime: searchTime,
            averageDelay: (prev.stats.averageDelay + searchTime) / 2
          }
        }));

        // 添加到搜索历史
        if (finalConfig.enableHistory && query.trim()) {
          setState(prev => {
            const newHistory = [query, ...prev.history.filter(item => item !== query)]
              .slice(0, finalConfig.maxHistoryItems);
            return { ...prev, history: newHistory };
          });
        }
      } catch (error) {
        console.error('搜索错误:', error);
        setState(prev => ({ ...prev, isSearching: false }));
      }
    };

    // 创建防抖函数
    if (finalConfig.smartDebounce) {
      debouncedSearchRef.current = smartDebounce(
        performSearch,
        finalConfig.minDelay,
        finalConfig.maxDelay
      );
    } else {
      debouncedSearchRef.current = debounce(performSearch, finalConfig.delay);
    }

    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [onSearch, finalConfig.delay, finalConfig.smartDebounce, finalConfig.minDelay, finalConfig.maxDelay, finalConfig.enableHistory, finalConfig.maxHistoryItems]);

  // 设置搜索词
  const setQuery = useCallback((newQuery: string) => {
    const processedQuery = finalConfig.trimWhitespace ? newQuery.trim() : newQuery;
    
    setState(prev => ({ ...prev, query: processedQuery }));

    // 检查最小长度
    if (processedQuery.length >= finalConfig.minLength) {
      debouncedSearchRef.current?.(processedQuery);
    } else {
      // 如果长度不足，取消搜索并清空结果
      debouncedSearchRef.current?.cancel();
      setState(prev => ({ 
        ...prev, 
        debouncedQuery: '',
        isSearching: false 
      }));
      
      // 如果查询为空，也要通知父组件
      if (processedQuery === '') {
        onSearch('');
      }
    }
  }, [finalConfig.minLength, finalConfig.trimWhitespace, onSearch]);

  // 立即搜索（跳过防抖）
  const searchImmediately = useCallback((query?: string) => {
    const searchQuery = query !== undefined ? query : state.query;
    debouncedSearchRef.current?.cancel();
    debouncedSearchRef.current?.flush();
    
    if (searchQuery.length >= finalConfig.minLength) {
      onSearch(searchQuery);
    }
  }, [state.query, finalConfig.minLength, onSearch]);

  // 清空搜索
  const clearSearch = useCallback(() => {
    debouncedSearchRef.current?.cancel();
    setState(prev => ({
      ...prev,
      query: '',
      debouncedQuery: '',
      isSearching: false
    }));
    onSearch('');
  }, [onSearch]);

  // 从历史记录搜索
  const searchFromHistory = useCallback((historyQuery: string) => {
    setQuery(historyQuery);
  }, [setQuery]);

  // 清空搜索历史
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  // 获取搜索建议（基于历史记录）
  const getSuggestions = useCallback((currentQuery: string, maxSuggestions: number = 5) => {
    if (!finalConfig.enableHistory || !currentQuery.trim()) {
      return [];
    }

    return state.history
      .filter(item => 
        item.toLowerCase().includes(currentQuery.toLowerCase()) && 
        item !== currentQuery
      )
      .slice(0, maxSuggestions);
  }, [state.history, finalConfig.enableHistory]);

  // 取消当前搜索
  const cancelSearch = useCallback(() => {
    debouncedSearchRef.current?.cancel();
    setState(prev => ({ ...prev, isSearching: false }));
  }, []);

  return {
    // 状态
    query: state.query,
    debouncedQuery: state.debouncedQuery,
    isSearching: state.isSearching,
    history: state.history,
    stats: state.stats,
    
    // 方法
    setQuery,
    searchImmediately,
    clearSearch,
    searchFromHistory,
    clearHistory,
    getSuggestions,
    cancelSearch,
    
    // 配置
    config: finalConfig
  };
}

/**
 * 简化版防抖搜索Hook
 * 只提供基本的防抖搜索功能
 */
export function useSimpleDebounceSearch(
  onSearch: (query: string) => void,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();

  useEffect(() => {
    const performSearch = (searchQuery: string) => {
      setIsSearching(true);
      onSearch(searchQuery);
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    };

    debouncedSearchRef.current = debounce(performSearch, delay);

    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [onSearch, delay]);

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSearchRef.current?.(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    debouncedSearchRef.current?.cancel();
    onSearch('');
  }, [onSearch]);

  return {
    query,
    debouncedQuery,
    isSearching,
    setQuery: handleQueryChange,
    clearSearch
  };
}

export default useDebounceSearch;