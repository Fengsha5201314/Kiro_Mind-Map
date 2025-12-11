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
  useReactFlow,
  useViewport
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useMindMapStore } from '../../stores/mindmapStore';
import { MindMapNode } from '../../types/mindmap';
import MindMapNodeComponent from './Node';
import MindMapControls from './Controls';
import ContextMenu from './ContextMenu';
import { virtualizationService, VirtualizationResult } from '../../services/virtualizationService';
import { useLazyLoading } from '../../hooks/useLazyLoading';

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

// 生成边连接
const generateEdges = (nodes: MindMapNode[]): Edge[] => {
  const edges: Edge[] = [];
  
  nodes.forEach(node => {
    if (node.parentId) {
      edges.push({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: 'smoothstep',
        style: {
          stroke: '#666',
          strokeWidth: 2
        },
        animated: false
      });
    }
  });
  
  return edges;
};

// 自动布局算法 - 简单的层级布局
const calculateNodePositions = (nodes: MindMapNode[]): MindMapNode[] => {
  const positioned = [...nodes];
  const levelGroups: { [level: number]: MindMapNode[] } = {};
  
  // 按层级分组
  positioned.forEach(node => {
    if (!levelGroups[node.level]) {
      levelGroups[node.level] = [];
    }
    levelGroups[node.level].push(node);
  });
  
  // 为每个层级计算位置
  Object.keys(levelGroups).forEach(levelStr => {
    const level = parseInt(levelStr);
    const nodesInLevel = levelGroups[level];
    const levelWidth = nodesInLevel.length * 200; // 每个节点占用200px宽度
    const startX = -levelWidth / 2;
    
    nodesInLevel.forEach((node, index) => {
      const nodeInArray = positioned.find(n => n.id === node.id);
      if (nodeInArray) {
        nodeInArray.position = {
          x: startX + index * 200,
          y: level * 120 // 每层间隔120px
        };
      }
    });
  });
  
  return positioned;
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
  const [virtualizationResult, setVirtualizationResult] = useState<VirtualizationResult | null>(null);
  const { fitView } = useReactFlow();
  const viewport = useViewport();

  // 懒加载功能
  const lazyLoading = useLazyLoading(currentMindMap?.nodes || [], {
    enabled: (currentMindMap?.nodes.length || 0) > 100, // 超过100个节点时启用懒加载
    initialLoadCount: 50,
    batchSize: 25,
    preloadDistance: 500
  });

  // 使用虚拟化渲染和懒加载优化的节点处理
  const processedNodes = useMemo(() => {
    if (!currentMindMap) {
      return { nodes: [], edges: [] };
    }

    // 使用懒加载的节点（如果启用）
    const nodesToProcess = lazyLoading.config.enabled 
      ? lazyLoading.loadedNodes 
      : currentMindMap.nodes;

    // 如果节点没有位置信息，进行自动布局
    const nodesWithPosition = nodesToProcess.some(node => !node.position)
      ? calculateNodePositions(nodesToProcess)
      : nodesToProcess;

    // 执行虚拟化渲染
    const viewportInfo = virtualizationService.calculateViewport(
      [viewport.x, viewport.y, viewport.zoom],
      { width: window.innerWidth, height: window.innerHeight }
    );

    const result = virtualizationService.virtualize(nodesWithPosition, viewportInfo);
    setVirtualizationResult(result);

    // 转换可见节点
    const reactFlowNodes = result.visibleNodes.map(node => 
      convertToReactFlowNode(node)
    );

    // 生成边（只为可见节点生成边）
    const reactFlowEdges = generateEdges(result.visibleNodes);

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
  }, [currentMindMap, lazyLoading.loadedNodes, lazyLoading.config.enabled, viewport.x, viewport.y, viewport.zoom, viewState.selectedNodeId]);

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
    // 更新节点位置到store
    updateNode(node.id, {
      position: node.position
    });
  }, [updateNode]);

  // 处理节点拖拽过程中
  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    // 使用RAF优化的拖拽处理
    optimizedNodeDrag(event, node);
  }, [optimizedNodeDrag]);

  // 处理视口变化，触发懒加载
  useEffect(() => {
    if (lazyLoading.config.enabled && lazyLoading.hasMore) {
      const viewportCenter = {
        x: -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom,
        y: -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom
      };
      
      const viewportSize = {
        width: window.innerWidth / viewport.zoom,
        height: window.innerHeight / viewport.zoom
      };

      // 延迟触发懒加载，避免频繁调用
      const timeoutId = setTimeout(() => {
        lazyLoading.loadByViewport(viewportCenter, viewportSize);
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [viewport.x, viewport.y, viewport.zoom, lazyLoading]);

  // 处理节点变化
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // 同步位置变化到store
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        updateNode(change.id, {
          position: change.position
        });
      }
    });
  }, [onNodesChange, updateNode]);

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

      {/* 性能统计（开发模式下显示） */}
      {process.env.NODE_ENV === 'development' && virtualizationResult && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div className="font-semibold mb-1">渲染性能</div>
          
          {/* 懒加载统计 */}
          {lazyLoading.config.enabled && (
            <div className="mb-2 border-b border-gray-600 pb-1">
              <div className="text-blue-400 font-medium">懒加载</div>
              <div>已加载: {lazyLoading.stats.loadedCount}/{lazyLoading.stats.totalNodes}</div>
              <div>进度: {(lazyLoading.progress * 100).toFixed(1)}%</div>
              <div>批次: {lazyLoading.stats.batchesLoaded}</div>
              {lazyLoading.isLoading && (
                <div className="text-yellow-400">正在加载...</div>
              )}
            </div>
          )}
          
          {/* 虚拟化统计 */}
          <div>
            <div className="text-purple-400 font-medium">虚拟化</div>
            <div>总节点: {virtualizationResult.totalNodes}</div>
            <div>可见节点: {virtualizationResult.visibleNodes.length}</div>
            {virtualizationResult.virtualizationEnabled && (
              <>
                <div>过滤节点: {virtualizationResult.stats.filteredNodes}</div>
                <div>渲染耗时: {virtualizationResult.stats.renderTime.toFixed(2)}ms</div>
              </>
            )}
            <div className={virtualizationResult.virtualizationEnabled ? "text-green-400" : "text-gray-400"}>
              {virtualizationResult.virtualizationEnabled ? '已启用' : '未启用'}
            </div>
          </div>
        </div>
      )}
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