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
const generateEdges = (nodes: MindMapNode[]): Edge[] => {
  const edges: Edge[] = [];
  
  nodes.forEach(node => {
    if (node.parentId) {
      edges.push({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: 'smoothstep', // 使用smoothstep实现直角折线
        style: {
          stroke: '#94a3b8', // 柔和的灰色
          strokeWidth: 2
        },
        animated: false
      });
    }
  });
  
  return edges;
};

// 树形布局算法 - 基于父子关系的水平树形布局
const calculateTreeLayout = (nodes: MindMapNode[]): MindMapNode[] => {
  if (nodes.length === 0) return [];
  
  const positioned = nodes.map(n => ({ ...n }));
  const nodeMap = new Map<string, MindMapNode>();
  positioned.forEach(node => nodeMap.set(node.id, node));
  
  // 找到根节点
  const rootNode = positioned.find(n => n.level === 0);
  if (!rootNode) return positioned;
  
  // 配置参数
  const HORIZONTAL_SPACING = 280; // 水平间距（层级之间）
  const VERTICAL_SPACING = 80;    // 垂直间距（同级节点之间）
  const NODE_HEIGHT = 50;         // 节点估计高度
  
  // 计算子树高度（递归）
  const calculateSubtreeHeight = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return NODE_HEIGHT;
    
    // 如果节点被折叠，只返回自身高度
    if (node.collapsed) return NODE_HEIGHT;
    
    const children = positioned.filter(n => n.parentId === nodeId);
    if (children.length === 0) return NODE_HEIGHT;
    
    let totalHeight = 0;
    children.forEach((child, index) => {
      totalHeight += calculateSubtreeHeight(child.id);
      if (index < children.length - 1) {
        totalHeight += VERTICAL_SPACING;
      }
    });
    
    return Math.max(NODE_HEIGHT, totalHeight);
  };
  
  // 递归布局节点
  const layoutNode = (nodeId: string, x: number, yStart: number): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return yStart;
    
    const children = positioned.filter(n => n.parentId === nodeId);
    const subtreeHeight = calculateSubtreeHeight(nodeId);
    
    // 如果没有子节点或被折叠，直接定位
    if (children.length === 0 || node.collapsed) {
      node.position = { x, y: yStart + subtreeHeight / 2 - NODE_HEIGHT / 2 };
      return yStart + subtreeHeight;
    }
    
    // 布局子节点
    let currentY = yStart;
    children.forEach((child, index) => {
      currentY = layoutNode(child.id, x + HORIZONTAL_SPACING, currentY);
      if (index < children.length - 1) {
        currentY += VERTICAL_SPACING;
      }
    });
    
    // 父节点垂直居中于子节点
    const firstChild = nodeMap.get(children[0].id);
    const lastChild = nodeMap.get(children[children.length - 1].id);
    if (firstChild?.position && lastChild?.position) {
      const centerY = (firstChild.position.y + lastChild.position.y) / 2;
      node.position = { x, y: centerY };
    } else {
      node.position = { x, y: yStart + subtreeHeight / 2 - NODE_HEIGHT / 2 };
    }
    
    return currentY;
  };
  
  // 从根节点开始布局
  layoutNode(rootNode.id, 0, 0);
  
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
    viewState,
    setSelectedNode,
    updateNode
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

  // 记录初始布局版本（仅在节点数量或折叠状态变化时更新）
  const [layoutKey, setLayoutKey] = useState(0);

  // 计算折叠状态的签名，用于检测折叠变化
  const collapseSignature = useMemo(() => {
    if (!currentMindMap) return '';
    return currentMindMap.nodes
      .filter(n => n.collapsed)
      .map(n => n.id)
      .sort()
      .join(',');
  }, [currentMindMap]);

  // 当节点数量或折叠状态变化时，触发重新布局
  useEffect(() => {
    setLayoutKey(k => k + 1);
  }, [currentMindMap?.nodes.length, collapseSignature]);

  // 处理节点数据：过滤折叠节点、计算布局
  const processedNodes = useMemo(() => {
    if (!currentMindMap) {
      return { nodes: [], edges: [] };
    }

    const nodesToProcess = currentMindMap.nodes;

    // 1. 先过滤掉被折叠隐藏的节点
    const visibleNodes = filterVisibleNodes(nodesToProcess);

    // 2. 计算树形布局
    const nodesWithPosition = calculateTreeLayout(visibleNodes);

    // 3. 转换为ReactFlow节点格式
    const reactFlowNodes = nodesWithPosition.map(node => 
      convertToReactFlowNode(node)
    );

    // 4. 生成边连接
    const reactFlowEdges = generateEdges(nodesWithPosition);

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
    // 关键：只依赖layoutKey，不依赖currentMindMap的其他变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  // 将思维导图数据转换为ReactFlow格式
  useEffect(() => {
    if (!currentMindMap) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setNodes(processedNodes.nodes);
    setEdges(processedNodes.edges);

    // 如果是新加载的思维导图，自动适应视图
    if (processedNodes.nodes.length > 0 && !viewState.selectedNodeId) {
      setTimeout(() => {
        fitView({ padding: 0.1 });
      }, 100);
    }
  }, [processedNodes, setNodes, setEdges, fitView, currentMindMap, viewState.selectedNodeId]);

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
    // 安全检查：确保position存在后再更新到store
    if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
      updateNode(node.id, {
        position: { x: node.position.x, y: node.position.y }
      });
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