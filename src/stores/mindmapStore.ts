/**
 * 思维导图状态管理 Store
 * 使用 Zustand 实现思维导图的状态管理，包括节点的增删改查操作
 */

import { create } from 'zustand';
import { MindMapData, MindMapNode, ViewState } from '../types/mindmap';
import { ThemeColors, THEME_PRESETS, getThemeById } from '../types/theme';
import { LayoutMode } from '../types/layout';

// 生成唯一ID的工具函数
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// 递归删除节点及其所有子节点
const deleteNodeRecursively = (nodes: MindMapNode[], nodeId: string): MindMapNode[] => {
  const nodeToDelete = nodes.find(node => node.id === nodeId);
  if (!nodeToDelete) return nodes;

  // 收集要删除的所有节点ID（包括子节点）
  const nodesToDelete = new Set<string>();
  
  const collectChildNodes = (id: string) => {
    nodesToDelete.add(id);
    const node = nodes.find(n => n.id === id);
    if (node) {
      node.children.forEach(childId => collectChildNodes(childId));
    }
  };
  
  collectChildNodes(nodeId);
  
  // 从父节点的children数组中移除被删除的节点
  const updatedNodes = nodes
    .filter(node => !nodesToDelete.has(node.id))
    .map(node => {
      if (node.children.includes(nodeId)) {
        return {
          ...node,
          children: node.children.filter(childId => childId !== nodeId),
          updatedAt: Date.now()
        };
      }
      return node;
    });
    
  return updatedNodes;
};

// 更新节点的父子关系
const updateParentChildRelation = (
  nodes: MindMapNode[], 
  nodeId: string, 
  oldParentId: string | null, 
  newParentId: string | null
): MindMapNode[] => {
  return nodes.map(node => {
    // 从旧父节点的children中移除
    if (node.id === oldParentId && node.children.includes(nodeId)) {
      return {
        ...node,
        children: node.children.filter(childId => childId !== nodeId),
        updatedAt: Date.now()
      };
    }
    
    // 添加到新父节点的children中
    if (node.id === newParentId && !node.children.includes(nodeId)) {
      return {
        ...node,
        children: [...node.children, nodeId],
        updatedAt: Date.now()
      };
    }
    
    // 更新被移动节点的parentId
    if (node.id === nodeId) {
      return {
        ...node,
        parentId: newParentId,
        updatedAt: Date.now()
      };
    }
    
    return node;
  });
};

// 历史记录最大长度
const MAX_HISTORY_LENGTH = 50;

// 生成状态枚举
export enum GenerationStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

// MindMap Store 接口定义
interface MindMapStore {
  // 状态
  currentMindMap: MindMapData | null;
  isLoading: boolean;
  error: string | null;
  viewState: ViewState;
  
  // 流式生成状态
  generationStatus: GenerationStatus;
  generationProgress: number; // 0-100
  
  // 主题配色
  currentTheme: ThemeColors;
  availableThemes: ThemeColors[];
  
  // 布局模式
  currentLayout: LayoutMode;
  
  // 历史记录（用于撤销/重做）
  history: MindMapData[];
  historyIndex: number;
  
  // 基础操作
  setMindMap: (data: MindMapData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
  
  // 流式生成操作
  setGenerationStatus: (status: GenerationStatus) => void;
  setGenerationProgress: (progress: number) => void;
  updatePartialMindMap: (partialData: Partial<MindMapData>) => void;
  addNodesIncremental: (nodes: MindMapNode[]) => void;
  
  // 主题操作
  setTheme: (themeId: string) => void;
  
  // 布局操作
  setLayout: (layout: LayoutMode) => void;
  
  // 节点操作
  updateNode: (nodeId: string, updates: Partial<MindMapNode>) => void;
  addNode: (parentId: string, content: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  expandAll: () => void;
  collapseToLevel: (level: number) => void;
  
  // 撤销/重做
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 视图状态操作
  setViewState: (viewState: Partial<ViewState>) => void;
  setSelectedNode: (nodeId: string | undefined) => void;
  setEditingNode: (nodeId: string | undefined) => void;
  
  // 工具方法
  getNodeById: (nodeId: string) => MindMapNode | undefined;
  getRootNodes: () => MindMapNode[];
  getChildNodes: (parentId: string) => MindMapNode[];
  getNodePath: (nodeId: string) => MindMapNode[];
}

// 保存历史记录的辅助函数
const saveToHistory = (
  currentMindMap: MindMapData | null,
  history: MindMapData[],
  historyIndex: number
): { history: MindMapData[]; historyIndex: number } => {
  if (!currentMindMap) return { history, historyIndex };
  
  // 如果当前不在历史末尾，删除后面的记录
  const newHistory = history.slice(0, historyIndex + 1);
  
  // 深拷贝当前状态
  const snapshot = JSON.parse(JSON.stringify(currentMindMap));
  newHistory.push(snapshot);
  
  // 限制历史记录长度
  if (newHistory.length > MAX_HISTORY_LENGTH) {
    newHistory.shift();
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }
  
  return { history: newHistory, historyIndex: newHistory.length - 1 };
};

// 创建 MindMap Store
export const useMindMapStore = create<MindMapStore>((set, get) => ({
  // 初始状态
  currentMindMap: null,
  isLoading: false,
  error: null,
  viewState: {
    zoom: 1,
    centerX: 0,
    centerY: 0,
    selectedNodeId: undefined,
    editingNodeId: undefined
  },
  
  // 流式生成状态
  generationStatus: GenerationStatus.IDLE,
  generationProgress: 0,
  
  // 主题配色
  currentTheme: THEME_PRESETS[0],
  availableThemes: THEME_PRESETS,
  
  // 布局模式
  currentLayout: LayoutMode.HORIZONTAL_TREE,
  
  history: [],
  historyIndex: -1,

  // 基础操作
  setMindMap: (data: MindMapData) => {
    const snapshot = JSON.parse(JSON.stringify(data));
    set({
      currentMindMap: data,
      error: null,
      history: [snapshot],
      historyIndex: 0,
      viewState: {
        zoom: 1,
        centerX: 0,
        centerY: 0,
        selectedNodeId: undefined,
        editingNodeId: undefined
      }
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clear: () => {
    set({
      currentMindMap: null,
      isLoading: false,
      error: null,
      viewState: {
        zoom: 1,
        centerX: 0,
        centerY: 0,
        selectedNodeId: undefined,
        editingNodeId: undefined
      }
    });
  },

  // 主题操作
  setTheme: (themeId: string) => {
    const theme = getThemeById(themeId);
    set({ currentTheme: theme });
  },

  // 布局操作
  setLayout: (layout: LayoutMode) => {
    const { currentMindMap } = get();
    
    // 清除所有节点的位置信息，强制重新布局
    if (currentMindMap) {
      const updatedNodes = currentMindMap.nodes.map(node => ({
        ...node,
        position: undefined
      }));
      
      set({
        currentLayout: layout,
        currentMindMap: {
          ...currentMindMap,
          nodes: updatedNodes,
          updatedAt: Date.now()
        }
      });
    } else {
      set({ currentLayout: layout });
    }
  },

  // 节点操作
  updateNode: (nodeId: string, updates: Partial<MindMapNode>) => {
    const { currentMindMap, history, historyIndex } = get();
    if (!currentMindMap) return;

    // 检查是否只是位置更新（不保存到历史）
    const isPositionOnlyUpdate = Object.keys(updates).length === 1 && 'position' in updates;

    const updatedNodes = currentMindMap.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          ...updates,
          updatedAt: Date.now()
        };
      }
      return node;
    });

    const newMindMap = {
      ...currentMindMap,
      nodes: updatedNodes,
      updatedAt: Date.now()
    };

    // 位置更新不保存历史（避免拖拽时产生大量历史记录）
    if (isPositionOnlyUpdate) {
      set({ currentMindMap: newMindMap });
    } else {
      const { history: newHistory, historyIndex: newIndex } = saveToHistory(newMindMap, history, historyIndex);
      set({ currentMindMap: newMindMap, history: newHistory, historyIndex: newIndex });
    }
  },

  addNode: (parentId: string, content: string) => {
    const { currentMindMap, history, historyIndex } = get();
    if (!currentMindMap) return;

    const parentNode = currentMindMap.nodes.find(node => node.id === parentId);
    if (!parentNode) return;

    const newNodeId = generateId();
    const newNode: MindMapNode = {
      id: newNodeId,
      content: content || '新节点',
      level: parentNode.level + 1,
      parentId: parentId,
      children: [],
      collapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 更新父节点的children数组
    const updatedNodes = currentMindMap.nodes.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...node.children, newNodeId],
          updatedAt: Date.now()
        };
      }
      return node;
    });

    // 添加新节点
    updatedNodes.push(newNode);

    const newMindMap = {
      ...currentMindMap,
      nodes: updatedNodes,
      updatedAt: Date.now()
    };

    const { history: newHistory, historyIndex: newIndex } = saveToHistory(newMindMap, history, historyIndex);
    set({ currentMindMap: newMindMap, history: newHistory, historyIndex: newIndex });
  },

  deleteNode: (nodeId: string) => {
    const { currentMindMap, history, historyIndex } = get();
    if (!currentMindMap) return;

    // 不允许删除根节点
    const nodeToDelete = currentMindMap.nodes.find(node => node.id === nodeId);
    if (!nodeToDelete || nodeToDelete.level === 0) return;

    const updatedNodes = deleteNodeRecursively(currentMindMap.nodes, nodeId);

    const newMindMap = {
      ...currentMindMap,
      nodes: updatedNodes,
      updatedAt: Date.now()
    };

    const { history: newHistory, historyIndex: newIndex } = saveToHistory(newMindMap, history, historyIndex);
    set({ currentMindMap: newMindMap, history: newHistory, historyIndex: newIndex });
  },

  moveNode: (nodeId: string, newParentId: string) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const nodeToMove = currentMindMap.nodes.find(node => node.id === nodeId);
    const newParent = currentMindMap.nodes.find(node => node.id === newParentId);
    
    if (!nodeToMove || !newParent) return;
    
    // 不允许移动根节点
    if (nodeToMove.level === 0) return;
    
    // 不允许将节点移动到自己的子节点下（避免循环引用）
    const isDescendant = (ancestorId: string, descendantId: string): boolean => {
      const descendant = currentMindMap.nodes.find(node => node.id === descendantId);
      if (!descendant || !descendant.parentId) return false;
      if (descendant.parentId === ancestorId) return true;
      return isDescendant(ancestorId, descendant.parentId);
    };
    
    if (isDescendant(nodeId, newParentId)) return;

    const updatedNodes = updateParentChildRelation(
      currentMindMap.nodes,
      nodeId,
      nodeToMove.parentId,
      newParentId
    ).map(node => {
      // 更新被移动节点的level
      if (node.id === nodeId) {
        return {
          ...node,
          level: newParent.level + 1
        };
      }
      return node;
    });

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
  },

  toggleNodeCollapse: (nodeId: string) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    // 清除所有节点的位置，强制重新布局
    const updatedNodes = currentMindMap.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          collapsed: !node.collapsed,
          position: undefined, // 清除位置
          updatedAt: Date.now()
        };
      }
      return {
        ...node,
        position: undefined // 清除所有节点位置以重新布局
      };
    });

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
  },

  // 展开所有节点 - 清除位置信息以强制重新布局
  expandAll: () => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const updatedNodes = currentMindMap.nodes.map(node => ({
      ...node,
      collapsed: false,
      position: undefined, // 清除位置，强制重新布局
      updatedAt: Date.now()
    }));

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
  },

  // 折叠到指定层级（只显示该层级及以上的节点）- 清除位置以强制重新布局
  collapseToLevel: (level: number) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const updatedNodes = currentMindMap.nodes.map(node => ({
      ...node,
      // 如果节点层级 >= 指定层级，则折叠该节点（隐藏其子节点）
      collapsed: node.level >= level,
      position: undefined, // 清除位置，强制重新布局
      updatedAt: Date.now()
    }));

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
  },

  // 撤销
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const previousState = JSON.parse(JSON.stringify(history[newIndex]));
    
    set({
      currentMindMap: previousState,
      historyIndex: newIndex
    });
  },

  // 重做
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const nextState = JSON.parse(JSON.stringify(history[newIndex]));
    
    set({
      currentMindMap: nextState,
      historyIndex: newIndex
    });
  },

  // 检查是否可以撤销
  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  // 检查是否可以重做
  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // 视图状态操作
  setViewState: (viewState: Partial<ViewState>) => {
    const { viewState: currentViewState } = get();
    set({
      viewState: {
        ...currentViewState,
        ...viewState
      }
    });
  },

  setSelectedNode: (nodeId: string | undefined) => {
    const { viewState } = get();
    set({
      viewState: {
        ...viewState,
        selectedNodeId: nodeId
      }
    });
  },

  setEditingNode: (nodeId: string | undefined) => {
    const { viewState } = get();
    set({
      viewState: {
        ...viewState,
        editingNodeId: nodeId
      }
    });
  },

  // 流式生成操作
  setGenerationStatus: (status: GenerationStatus) => {
    set({ generationStatus: status });
  },

  setGenerationProgress: (progress: number) => {
    set({ generationProgress: Math.min(100, Math.max(0, progress)) });
  },

  updatePartialMindMap: (partialData: Partial<MindMapData>) => {
    const { currentMindMap } = get();
    
    if (!currentMindMap) {
      // 如果还没有思维导图，创建一个新的
      const newMindMap: MindMapData = {
        id: generateId(),
        title: partialData.title || '生成中...',
        nodes: partialData.nodes || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: partialData.metadata
      };
      set({ currentMindMap: newMindMap });
    } else {
      // 更新现有思维导图
      const updatedMindMap = {
        ...currentMindMap,
        ...partialData,
        updatedAt: Date.now()
      };
      set({ currentMindMap: updatedMindMap });
    }
  },

  addNodesIncremental: (newNodes: MindMapNode[]) => {
    const { currentMindMap } = get();
    
    if (!currentMindMap) {
      // 创建新的思维导图
      const mindMap: MindMapData = {
        id: generateId(),
        title: '生成中...',
        nodes: newNodes,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      set({ currentMindMap: mindMap });
    } else {
      // 增量添加节点（避免重复）
      const existingIds = new Set(currentMindMap.nodes.map(n => n.id));
      const nodesToAdd = newNodes.filter(n => !existingIds.has(n.id));
      
      if (nodesToAdd.length > 0) {
        const updatedMindMap = {
          ...currentMindMap,
          nodes: [...currentMindMap.nodes, ...nodesToAdd],
          updatedAt: Date.now()
        };
        set({ currentMindMap: updatedMindMap });
      }
    }
  },

  // 工具方法
  getNodeById: (nodeId: string) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return undefined;
    return currentMindMap.nodes.find(node => node.id === nodeId);
  },

  getRootNodes: () => {
    const { currentMindMap } = get();
    if (!currentMindMap) return [];
    return currentMindMap.nodes.filter(node => node.level === 0);
  },

  getChildNodes: (parentId: string) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return [];
    return currentMindMap.nodes.filter(node => node.parentId === parentId);
  },

  getNodePath: (nodeId: string) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return [];
    
    const path: MindMapNode[] = [];
    let currentNode = currentMindMap.nodes.find(node => node.id === nodeId);
    
    while (currentNode) {
      path.unshift(currentNode);
      if (currentNode.parentId) {
        currentNode = currentMindMap.nodes.find(node => node.id === currentNode!.parentId);
      } else {
        break;
      }
    }
    
    return path;
  }
}));

export default useMindMapStore;