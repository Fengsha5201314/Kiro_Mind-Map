/**
 * 思维导图状态管理 Store
 * 使用 Zustand 实现思维导图的状态管理，包括节点的增删改查操作
 */

import { create } from 'zustand';
import { MindMapData, MindMapNode, ViewState } from '../types/mindmap';

// 生成唯一ID的工具函数
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// MindMap Store 接口定义
interface MindMapStore {
  // 状态
  currentMindMap: MindMapData | null;
  isLoading: boolean;
  error: string | null;
  viewState: ViewState;
  
  // 基础操作
  setMindMap: (data: MindMapData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
  
  // 节点操作
  updateNode: (nodeId: string, updates: Partial<MindMapNode>) => void;
  addNode: (parentId: string, content: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  
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

  // 基础操作
  setMindMap: (data: MindMapData) => {
    set({
      currentMindMap: data,
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

  // 节点操作
  updateNode: (nodeId: string, updates: Partial<MindMapNode>) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

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

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
  },

  addNode: (parentId: string, content: string) => {
    const { currentMindMap } = get();
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

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
  },

  deleteNode: (nodeId: string) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    // 不允许删除根节点
    const nodeToDelete = currentMindMap.nodes.find(node => node.id === nodeId);
    if (!nodeToDelete || nodeToDelete.level === 0) return;

    const updatedNodes = deleteNodeRecursively(currentMindMap.nodes, nodeId);

    set({
      currentMindMap: {
        ...currentMindMap,
        nodes: updatedNodes,
        updatedAt: Date.now()
      }
    });
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

    const updatedNodes = currentMindMap.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          collapsed: !node.collapsed,
          updatedAt: Date.now()
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