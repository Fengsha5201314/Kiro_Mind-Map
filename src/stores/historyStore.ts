/**
 * 历史记录状态管理 Store
 * 使用 Zustand 实现思维导图历史记录的状态管理
 */

import { create } from 'zustand';
import { MindMapData } from '../types/mindmap';
import { storageService } from '../services/storageService';

// 历史记录项接口（简化版，用于显示）
interface HistoryItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
  sourceType?: 'file' | 'text' | 'topic';
  sourceFileName?: string;
}

// 将MindMapData转换为HistoryItem
const mindMapToHistoryItem = (mindMap: MindMapData): HistoryItem => ({
  id: mindMap.id,
  title: mindMap.title,
  createdAt: mindMap.createdAt,
  updatedAt: mindMap.updatedAt,
  nodeCount: mindMap.nodes.length,
  sourceType: mindMap.metadata?.sourceType,
  sourceFileName: mindMap.metadata?.sourceFileName
});



// 分页信息接口
interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// History Store 接口定义
interface HistoryStore {
  // 状态
  mindMaps: MindMapData[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredMindMaps: MindMapData[];
  pagination: PaginationInfo;
  
  // 基础操作
  loadHistory: () => Promise<void>;
  addToHistory: (data: MindMapData) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  
  // 搜索和过滤
  setSearchQuery: (query: string) => void;
  searchMindMaps: (query: string) => Promise<void>;
  
  // 分页操作
  loadPage: (page: number) => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 工具方法
  getMindMapById: (id: string) => Promise<MindMapData | null>;
  getHistoryItem: (id: string) => MindMapData | undefined;
  sortHistory: (sortBy: 'createdAt' | 'updatedAt' | 'title', order: 'asc' | 'desc') => void;
  getStorageInfo: () => Promise<any>;
  
  // 批量操作
  removeMultiple: (ids: string[]) => Promise<void>;
  exportHistory: () => MindMapData[];
}

// 默认分页信息
const DEFAULT_PAGINATION: PaginationInfo = {
  currentPage: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false
};



// 计算分页信息
const calculatePagination = (
  totalItems: number, 
  currentPage: number, 
  pageSize: number
): PaginationInfo => {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    currentPage: Math.max(1, Math.min(currentPage, totalPages)),
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
};

// 过滤历史记录
const filterMindMaps = (mindMaps: MindMapData[], query: string): MindMapData[] => {
  if (!query.trim()) {
    return mindMaps;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  return mindMaps.filter(item => 
    item.title.toLowerCase().includes(lowerQuery) ||
    (item.metadata?.sourceFileName && item.metadata.sourceFileName.toLowerCase().includes(lowerQuery)) ||
    (item.metadata?.sourceType && item.metadata.sourceType.toLowerCase().includes(lowerQuery))
  );
};

// 创建 History Store
export const useHistoryStore = create<HistoryStore>((set, get) => ({
  // 初始状态
  mindMaps: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredMindMaps: [],
  pagination: DEFAULT_PAGINATION,

  // 基础操作
  loadHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const allMindMaps = await storageService.getAllMindMaps();
      
      // 按更新时间倒序排列
      const sortedMindMaps = allMindMaps.sort((a, b) => b.updatedAt - a.updatedAt);
      
      const { searchQuery, pagination } = get();
      const filteredItems = filterMindMaps(sortedMindMaps, searchQuery);
      
      // 重新计算分页
      const newPagination = calculatePagination(
        filteredItems.length,
        1, // 重置到第一页
        pagination.pageSize
      );
      
      set({
        mindMaps: sortedMindMaps,
        filteredMindMaps: filteredItems,
        pagination: newPagination,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载历史记录失败';
      set({
        mindMaps: [],
        filteredMindMaps: [],
        pagination: DEFAULT_PAGINATION,
        isLoading: false,
        error: errorMessage
      });
    }
  },

  addToHistory: async (data: MindMapData) => {
    try {
      set({ isLoading: true, error: null });
      
      // 保存到存储
      await storageService.saveMindMap(data);
      
      // 更新本地状态
      const { mindMaps, searchQuery, pagination } = get();
      
      // 检查是否已存在，如果存在则更新，否则添加
      const existingIndex = mindMaps.findIndex(item => item.id === data.id);
      let updatedMindMaps: MindMapData[];
      
      if (existingIndex >= 0) {
        // 更新现有项
        updatedMindMaps = [...mindMaps];
        updatedMindMaps[existingIndex] = data;
      } else {
        // 添加新项到开头
        updatedMindMaps = [data, ...mindMaps];
      }
      
      // 按更新时间重新排序
      updatedMindMaps.sort((a, b) => b.updatedAt - a.updatedAt);
      
      const filteredItems = filterMindMaps(updatedMindMaps, searchQuery);
      
      // 重新计算分页
      const newPagination = calculatePagination(
        filteredItems.length,
        pagination.currentPage,
        pagination.pageSize
      );
      
      set({
        mindMaps: updatedMindMaps,
        filteredMindMaps: filteredItems,
        pagination: newPagination,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存到历史记录失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  removeFromHistory: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // 从存储中删除
      await storageService.deleteMindMap(id);
      
      // 更新本地状态
      const { mindMaps, searchQuery, pagination } = get();
      const updatedMindMaps = mindMaps.filter(item => item.id !== id);
      const filteredItems = filterMindMaps(updatedMindMaps, searchQuery);
      
      // 重新计算分页
      const newPagination = calculatePagination(
        filteredItems.length,
        pagination.currentPage,
        pagination.pageSize
      );
      
      set({
        mindMaps: updatedMindMaps,
        filteredMindMaps: filteredItems,
        pagination: newPagination,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除历史记录失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  clearHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // 获取所有思维导图ID并删除
      const { mindMaps } = get();
      const deletePromises = mindMaps.map(item => storageService.deleteMindMap(item.id));
      await Promise.all(deletePromises);
      
      set({
        mindMaps: [],
        filteredMindMaps: [],
        pagination: DEFAULT_PAGINATION,
        searchQuery: '',
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '清空历史记录失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // 搜索和过滤
  setSearchQuery: (query: string) => {
    const { mindMaps, pagination } = get();
    const filteredItems = filterMindMaps(mindMaps, query);
    
    // 重新计算分页
    const newPagination = calculatePagination(
      filteredItems.length,
      1, // 重置到第一页
      pagination.pageSize
    );
    
    set({
      searchQuery: query,
      filteredMindMaps: filteredItems,
      pagination: newPagination
    });
  },

  searchMindMaps: async (query: string) => {
    try {
      set({ isLoading: true, error: null });
      
      if (!query.trim()) {
        // 如果查询为空，重新加载所有历史记录
        await get().loadHistory();
        return;
      }
      
      // 使用存储服务的搜索功能
      const searchResults = await storageService.searchMindMaps(query);
      const sortedResults = searchResults.sort((a, b) => b.updatedAt - a.updatedAt);
      
      const { pagination } = get();
      const newPagination = calculatePagination(
        sortedResults.length,
        1,
        pagination.pageSize
      );
      
      set({
        searchQuery: query,
        filteredMindMaps: sortedResults,
        pagination: newPagination,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '搜索失败';
      set({
        isLoading: false,
        error: errorMessage
      });
    }
  },

  // 分页操作
  loadPage: async (page: number) => {
    const { filteredMindMaps, pagination } = get();
    
    const newPagination = calculatePagination(
      filteredMindMaps.length,
      page,
      pagination.pageSize
    );
    
    set({ pagination: newPagination });
  },

  setPageSize: async (size: number) => {
    const { filteredMindMaps } = get();
    
    const newPagination = calculatePagination(
      filteredMindMaps.length,
      1, // 重置到第一页
      size
    );
    
    set({ pagination: newPagination });
  },

  // 状态管理
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // 工具方法
  getMindMapById: async (id: string) => {
    try {
      return await storageService.getMindMap(id);
    } catch (error) {
      console.error('获取思维导图失败:', error);
      return null;
    }
  },

  getHistoryItem: (id: string) => {
    const { mindMaps } = get();
    return mindMaps.find(item => item.id === id);
  },

  sortHistory: (sortBy: 'createdAt' | 'updatedAt' | 'title', order: 'asc' | 'desc') => {
    const { mindMaps, searchQuery, pagination } = get();
    
    const sortedMindMaps = [...mindMaps].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'zh-CN');
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
    
    const filteredItems = filterMindMaps(sortedMindMaps, searchQuery);
    
    // 重新计算分页
    const newPagination = calculatePagination(
      filteredItems.length,
      1, // 重置到第一页
      pagination.pageSize
    );
    
    set({
      mindMaps: sortedMindMaps,
      filteredMindMaps: filteredItems,
      pagination: newPagination
    });
  },

  getStorageInfo: async () => {
    try {
      return await storageService.getStorageInfo();
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  },

  // 批量操作
  removeMultiple: async (ids: string[]) => {
    try {
      set({ isLoading: true, error: null });
      
      // 批量删除
      const deletePromises = ids.map(id => storageService.deleteMindMap(id));
      await Promise.all(deletePromises);
      
      // 更新本地状态
      const { mindMaps, searchQuery, pagination } = get();
      const updatedMindMaps = mindMaps.filter(item => !ids.includes(item.id));
      const filteredItems = filterMindMaps(updatedMindMaps, searchQuery);
      
      // 重新计算分页
      const newPagination = calculatePagination(
        filteredItems.length,
        pagination.currentPage,
        pagination.pageSize
      );
      
      set({
        mindMaps: updatedMindMaps,
        filteredMindMaps: filteredItems,
        pagination: newPagination,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  exportHistory: () => {
    const { mindMaps } = get();
    return [...mindMaps];
  }
}));

// 获取分页后的历史记录项
export const getPaginatedHistoryItems = (store: ReturnType<typeof useHistoryStore.getState>) => {
  const { filteredMindMaps, pagination } = store;
  const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  
  return filteredMindMaps.slice(startIndex, endIndex);
};

export default useHistoryStore;