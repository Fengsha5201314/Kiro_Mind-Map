/**
 * 思维导图画布组件
 * 基于ReactFlow实现的交互式思维导图画布
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useMindMapStore } from '../../stores/mindmapStore';
import { MindMapNode } from '../../types/mindmap';
import { ThemeColors } from '../../types/theme';
import MindMapNodeComponent from './Node';
import MindMapControls from './Controls';
import ContextMenu from './ContextMenu';
import { rafThrottle } from '../../utils/performance';

// 自定义节点类型映射
const nodeTypes = {
  mindmapNode: MindMapNodeComponent
};

// 将MindMapNode转换为ReactFlow Node
const convertToReactFlowNode = (mindMapNode: MindMapNode): Node => {
  return {
    id: mindMapNode.id,
    type: 'mindmapNode', // 使用自定义节点类型
    position: mindMapNode.position || { x: 0, y: 0 },
    data: {
      label: mindMapNode.content,
      level: mindMapNode.level,
      collapsed: mindMapNode.collapsed || false,
      nodeData: mindMapNode
    },
    draggable: true,
    selectable: true
  };
};

// 生成边连接 - 使用smoothstep实现类似豆包的直角折线效果
const generateEdges = (nodes: MindMapNode[], theme: ThemeColors): Edge[] => {
  const edges: Edge[] = [];
  
  nodes.forEach(node => {
    if (node.parentId) {
      edges.push({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: 'smoothstep', // 使用smoothstep实现直角折线
        style: {
          stroke: theme.edgeColor,
          strokeWidth: 2
        },
        animated: false
      });
    }
  });
  
  return edges;
};

/**
 * 专业级思维导图布局算法
 * 
 * 展示要求：
 * 1. 根节点在左侧，子节点向右展开
 * 2. 同层级节点 X 坐标相同（垂直对齐）
 * 3. 节点之间绝对不重叠
 * 4. 父节点垂直居中于其所有子节点
 * 5. 连接线清晰，无交叉
 * 6. 布局紧凑但不拥挤
 */

// 布局配置常量
const LAYOUT_CONFIG = {
  BASE_HORIZONTAL_SPACING: 300,  // 基础水平间距（增大以避免水平重叠）
  CHAR_WIDTH: 14,                // 每个字符的估算宽度
  MIN_NODE_WIDTH: 120,           // 最小节点宽度
  MAX_NODE_WIDTH: 350,           // 最大节点宽度
  NODE_HEIGHT: 50,               // 节点高度（增大以确保足够空间）
  VERTICAL_GAP: 30,              // 节点间垂直间隙（固定值，确保不重叠）
};

// 估算节点宽度（基于内容长度）
const estimateNodeWidth = (content: string): number => {
  // 中文字符算2个单位，英文算1个单位
  let charUnits = 0;
  for (const char of content) {
    charUnits += char.charCodeAt(0) > 127 ? 2 : 1;
  }
  const estimatedWidth = charUnits * (LAYOUT_CONFIG.CHAR_WIDTH / 2) + 50; // 50是padding
  return Math.min(
    Math.max(estimatedWidth, LAYOUT_CONFIG.MIN_NODE_WIDTH),
    LAYOUT_CONFIG.MAX_NODE_WIDTH
  );
};

/**
 * 简洁可靠的树形布局算法
 * 
 * 核心思路：
 * 1. 自底向上计算每个节点的子树所需高度
 * 2. 自顶向下分配Y坐标，确保子树之间不重叠
 * 3. 父节点Y坐标 = 其所有子节点Y坐标的中心
 */
const calculateTreeLayout = (nodes: MindMapNode[]): MindMapNode[] => {
  if (nodes.length === 0) return [];
  
  // 复制节点数组，清除旧位置
  const positioned = nodes.map(n => ({ ...n, position: undefined as { x: number; y: number } | undefined }));
  const nodeMap = new Map<string, MindMapNode>();
  positioned.forEach(node => nodeMap.set(node.id, node));
  
  // 找到根节点
  const rootNode = positioned.find(n => n.level === 0);
  if (!rootNode) return positioned;
  
  // 获取节点的直接子节点（未折叠的）
  const getChildren = (nodeId: string): MindMapNode[] => {
    const node = nodeMap.get(nodeId);
    if (!node || node.collapsed) return [];
    return positioned.filter(n => n.parentId === nodeId);
  };
  
  // 计算每层的最大节点宽度
  const levelMaxWidths = new Map<number, number>();
  positioned.forEach(node => {
    const width = estimateNodeWidth(node.content);
    const currentMax = levelMaxWidths.get(node.level) || 0;
    levelMaxWidths.set(node.level, Math.max(currentMax, width));
  });
  
  // 计算每层的X坐标
  const levelXPositions = new Map<number, number>();
  let accumulatedX = 0;
  const maxLevel = Math.max(...positioned.map(n => n.level));
  for (let level = 0; level <= maxLevel; level++) {
    levelXPositions.set(level, accumulatedX);
    const levelWidth = levelMaxWidths.get(level) || LAYOUT_CONFIG.MIN_NODE_WIDTH;
    accumulatedX += levelWidth + LAYOUT_CONFIG.BASE_HORIZONTAL_SPACING;
  }
  
  // 存储每个节点子树的高度
  const subtreeHeights = new Map<string, number>();
  
  /**
   * 第一遍：自底向上计算子树高度
   * 子树高度 = 所有子节点子树高度之和 + 子节点之间的间隙
   * 叶子节点的子树高度 = 节点高度
   */
  const calcSubtreeHeight = (nodeId: string): number => {
    const children = getChildren(nodeId);
    
    if (children.length === 0) {
      // 叶子节点
      subtreeHeights.set(nodeId, LAYOUT_CONFIG.NODE_HEIGHT);
      return LAYOUT_CONFIG.NODE_HEIGHT;
    }
    
    // 递归计算所有子节点的子树高度
    let totalHeight = 0;
    children.forEach((child, index) => {
      totalHeight += calcSubtreeHeight(child.id);
      // 子节点之间添加间隙
      if (index < children.length - 1) {
        totalHeight += LAYOUT_CONFIG.VERTICAL_GAP;
      }
    });
    
    subtreeHeights.set(nodeId, totalHeight);
    return totalHeight;
  };
  
  // 计算根节点的子树高度
  calcSubtreeHeight(rootNode.id);
  
  /**
   * 第二遍：自顶向下分配位置
   * @param nodeId 节点ID
   * @param x X坐标
   * @param yTop 该节点子树可用空间的顶部Y坐标
   */
  const assignPosition = (nodeId: string, x: number, yTop: number): void => {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    const children = getChildren(nodeId);
    
    if (children.length === 0) {
      // 叶子节点：直接放在子树空间的顶部
      node.position = { x, y: yTop };
      return;
    }
    
    // 有子节点：先布局子节点，然后将父节点居中
    const childX = levelXPositions.get(node.level + 1) || (x + LAYOUT_CONFIG.BASE_HORIZONTAL_SPACING);
    let currentY = yTop;
    
    // 布局所有子节点
    children.forEach((child, index) => {
      const childSubtreeHeight = subtreeHeights.get(child.id) || LAYOUT_CONFIG.NODE_HEIGHT;
      assignPosition(child.id, childX, currentY);
      currentY += childSubtreeHeight;
      if (index < children.length - 1) {
        currentY += LAYOUT_CONFIG.VERTICAL_GAP;
      }
    });
    
    // 父节点Y坐标 = 第一个子节点和最后一个子节点Y坐标的中点
    const firstChild = children[0];
    const lastChild = children[children.length - 1];
    const firstChildY = firstChild.position?.y || yTop;
    const lastChildY = lastChild.position?.y || yTop;
    
    // 父节点居中于子节点
    const parentY = (firstChildY + lastChildY) / 2;
    node.position = { x, y: parentY };
  };
  
  // 从根节点开始分配位置
  const rootX = levelXPositions.get(0) || 0;
  assignPosition(rootNode.id, rootX, 0);
  
  return positioned;
};

// 过滤可见节点（处理折叠状态）
const filterVisibleNodes = (nodes: MindMapNode[]): MindMapNode[] => {
  const nodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));
  
  // 检查节点是否应该被隐藏（任何祖先节点被折叠）
  const isHidden = (nodeId: string): boolean => {
    const node = nodeMap.get(nodeId);
    if (!node || !node.parentId) return false;
    
    const parent = nodeMap.get(node.parentId);
    if (!parent) return false;
    
    // 如果父节点被折叠，则隐藏
    if (parent.collapsed) return true;
    
    // 递归检查祖先节点
    return isHidden(node.parentId);
  };
  
  return nodes.filter(node => !isHidden(node.id));
};

// 画布内部组件
const CanvasInner: React.FC = () => {
  const {
    currentMindMap,
    setSelectedNode,
    updateNode,
    currentTheme
  } = useMindMapStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null
  });
  const { fitView } = useReactFlow();

  // 使用ref存储用户手动拖拽的节点位置，避免被自动布局覆盖
  const userDraggedPositions = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // 记录上一次的结构签名，用于检测结构变化
  const prevStructureRef = React.useRef<string>('');

  // 计算结构签名（仅用于判断是否需要重新布局：节点ID + 折叠状态）
  const layoutSignature = useMemo(() => {
    if (!currentMindMap) return '';
    
    const visibleNodes = filterVisibleNodes(currentMindMap.nodes);
    const nodeIds = visibleNodes.map(n => n.id).sort().join(',');
    const collapseState = currentMindMap.nodes
      .filter(n => n.collapsed)
      .map(n => n.id)
      .sort()
      .join('|');
    
    return `${nodeIds}::${collapseState}`;
  }, [currentMindMap]);

  // 处理节点数据：过滤折叠节点、计算布局
  const processedNodes = useMemo(() => {
    if (!currentMindMap) {
      return { nodes: [], edges: [] };
    }

    // 1. 先过滤掉被折叠隐藏的节点
    const visibleNodes = filterVisibleNodes(currentMindMap.nodes);

    // 2. 检测布局结构是否变化（不包含内容变化）
    const layoutChanged = prevStructureRef.current !== layoutSignature;
    
    // 3. 判断是否需要重新布局（仅在结构变化时重新布局，内容变化不重新布局）
    const needsLayout = layoutChanged || visibleNodes.some(node => !node.position);
    
    let nodesWithPosition: MindMapNode[];
    if (needsLayout) {
      // 结构变化时，清除用户拖拽位置缓存，重新布局
      if (layoutChanged) {
        userDraggedPositions.current.clear();
        prevStructureRef.current = layoutSignature;
      }
      nodesWithPosition = calculateTreeLayout(visibleNodes);
    } else {
      // 结构未变化，保持现有位置
      nodesWithPosition = visibleNodes.map(node => {
        // 优先使用用户拖拽的位置
        const draggedPos = userDraggedPositions.current.get(node.id);
        if (draggedPos) {
          return { ...node, position: draggedPos };
        }
        return node;
      });
    }

    // 4. 转换为ReactFlow节点格式（每次都重新转换以确保内容更新）
    const reactFlowNodes = nodesWithPosition.map(node => 
      convertToReactFlowNode(node)
    );

    // 5. 生成边连接（使用主题颜色）
    const reactFlowEdges = generateEdges(nodesWithPosition, currentTheme);

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
  }, [currentMindMap, layoutSignature, currentTheme]);

  // 记录是否是首次加载
  const isFirstLoad = React.useRef(true);
  // 记录上一次的结构签名，用于useEffect中检测变化
  const prevSignatureForEffect = React.useRef<string>('');

  // 获取撤销/重做方法
  const { undo, redo, canUndo, canRedo, deleteNode, viewState } = useMindMapStore();

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }
      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
      // Delete 或 Backspace 删除选中节点
      if ((e.key === 'Delete' || e.key === 'Backspace') && viewState.selectedNodeId) {
        // 检查是否在编辑状态
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
          return; // 在输入框中不处理删除
        }
        e.preventDefault();
        const selectedNode = currentMindMap?.nodes.find(n => n.id === viewState.selectedNodeId);
        if (selectedNode && selectedNode.level > 0) {
          deleteNode(viewState.selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, deleteNode, viewState.selectedNodeId, currentMindMap]);

  // 将思维导图数据转换为ReactFlow格式
  useEffect(() => {
    if (!currentMindMap) {
      setNodes([]);
      setEdges([]);
      isFirstLoad.current = true;
      prevSignatureForEffect.current = '';
      return;
    }

    // 检测布局结构是否变化
    const layoutChanged = prevSignatureForEffect.current !== layoutSignature;
    
    // 始终更新节点数据（确保内容编辑后能立即显示）
    setNodes(processedNodes.nodes);
    setEdges(processedNodes.edges);

    // 仅在布局结构变化或首次加载时自动适应视图
    if (layoutChanged || isFirstLoad.current) {
      prevSignatureForEffect.current = layoutSignature;

      // 自动适应视图（首次加载或结构变化时）
      if (processedNodes.nodes.length > 0) {
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
        }
        // 延迟执行fitView，确保节点已渲染
        setTimeout(() => {
          fitView({ padding: 0.15, duration: 300 });
        }, 50);
      }
    }
  }, [processedNodes, layoutSignature, setNodes, setEdges, fitView, currentMindMap]);

  // 处理节点选择
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // 处理节点双击编辑
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, _node: Node) => {
    // 双击编辑功能在Node组件中处理
  }, []);

  // 处理画布点击（取消选择）
  const onPaneClick = useCallback(() => {
    setSelectedNode(undefined);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  }, [setSelectedNode]);

  // 处理节点右键点击
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    
    setSelectedNode(node.id);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id
    });
  }, [setSelectedNode]);

  // 处理画布右键点击
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  }, []);

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  }, []);

  // 使用RAF优化的节点拖拽处理
  const optimizedNodeDrag = useCallback(
    rafThrottle((_event: React.MouseEvent, _node: Node) => {
      // RAF优化的拖拽处理，减少重绘次数
      // 实时更新视图状态
    }),
    []
  );

  // 处理节点拖拽开始
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    // 拖拽开始时选中节点
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // 处理节点拖拽结束
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // 安全检查：确保position存在后再更新
    if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
      const newPosition = { x: node.position.x, y: node.position.y };
      
      // 保存到用户拖拽位置缓存（优先级最高，不会被自动布局覆盖）
      userDraggedPositions.current.set(node.id, newPosition);
      
      // 同时更新到store（用于持久化）
      updateNode(node.id, { position: newPosition });
    }
  }, [updateNode]);

  // 处理节点拖拽过程中
  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    // 使用RAF优化的拖拽处理
    optimizedNodeDrag(event, node);
  }, [optimizedNodeDrag]);



  // 处理节点变化 - 只处理ReactFlow内部状态，不同步到store
  // 位置同步在onNodeDragStop中处理，避免拖拽过程中频繁更新导致错误
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // 处理边变化
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  // 处理连接创建（暂时禁用，因为我们使用树状结构）
  const onConnect = useCallback((params: Connection) => {
    // 在思维导图中，连接关系由数据结构决定，不允许随意连接
    console.log('连接操作暂不支持', params);
  }, []);

  // 小地图配置
  const minimapConfig = {
    nodeColor: '#666',
    maskColor: 'rgba(0, 0, 0, 0.1)',
    position: 'bottom-right' as const
  };

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
        selectNodesOnDrag={false}
        multiSelectionKeyCode={null}
        deleteKeyCode={null}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        panOnDrag={true}
        minZoom={0.1}
        maxZoom={4}
      >
        {/* 背景网格 */}
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#ccc"
        />
        
        {/* 小地图 */}
        <MiniMap {...minimapConfig} />
        
        {/* 自定义控制按钮 */}
        <MindMapControls />
      </ReactFlow>

      {/* 右键上下文菜单 */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        nodeId={contextMenu.nodeId}
        onClose={closeContextMenu}
      />


    </div>
  );
};

// 主画布组件（包装ReactFlowProvider）
const Canvas: React.FC = () => {
  const { currentMindMap, isLoading, error } = useMindMapStore();

  // 加载状态
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载思维导图...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 空状态
  if (!currentMindMap) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🧠</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">暂无思维导图</h3>
          <p className="text-gray-600">请上传文件或输入内容来生成思维导图</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
};

export default Canvas;