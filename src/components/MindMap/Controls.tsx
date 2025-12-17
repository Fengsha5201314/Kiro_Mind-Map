/**
 * 思维导图画布控制按钮组件
 * 提供缩放、适应视图、重置等控制功能
 */

import React, { useState } from 'react';
import { useReactFlow } from 'reactflow';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  Move,
  Download,
  Expand,
  Minimize2,
  Undo2,
  Redo2
} from 'lucide-react';
import { useMindMapStore } from '../../stores/mindmapStore';
import ExportPanel from '../Export/ExportPanel';
import ThemeSelector from './ThemeSelector';

// 控制按钮组件
const MindMapControls: React.FC = () => {
  const { 
    zoomIn, 
    zoomOut, 
    fitView, 
    setCenter, 
    getZoom,
 
  } = useReactFlow();
  
  const { 
    currentMindMap,
    viewState,
    setViewState,
    expandAll,
    collapseToLevel,
    undo,
    redo,
    canUndo,
    canRedo
  } = useMindMapStore();

  // 导出面板状态
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);

  // 放大
  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
    // 延迟获取缩放值，等待动画完成
    setTimeout(() => {
      setViewState({ zoom: getZoom() });
    }, 250);
  };

  // 缩小
  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
    // 延迟获取缩放值，等待动画完成
    setTimeout(() => {
      setViewState({ zoom: getZoom() });
    }, 250);
  };

  // 适应视图
  const handleFitView = () => {
    fitView({ 
      padding: 0.1,
      duration: 300
    });
    setTimeout(() => {
      setViewState({ 
        zoom: getZoom(),
        centerX: 0,
        centerY: 0
      });
    }, 300);
  };

  // 重置视图
  const handleResetView = () => {
    setCenter(0, 0, { zoom: 1, duration: 300 });
    setViewState({
      zoom: 1,
      centerX: 0,
      centerY: 0
    });
  };

  // 居中显示
  const handleCenterView = () => {
    if (currentMindMap && currentMindMap.nodes.length > 0) {
      // 找到根节点
      const rootNode = currentMindMap.nodes.find(node => node.level === 0);
      if (rootNode && rootNode.position) {
        setCenter(rootNode.position.x, rootNode.position.y, { 
          zoom: getZoom(),
          duration: 300 
        });
      }
    }
  };

  // 获取当前缩放级别的显示文本
  const getZoomText = () => {
    const zoom = viewState.zoom || 1;
    return `${Math.round(zoom * 100)}%`;
  };

  // 打开导出面板
  const handleOpenExportPanel = () => {
    setIsExportPanelOpen(true);
  };

  // 关闭导出面板
  const handleCloseExportPanel = () => {
    setIsExportPanelOpen(false);
  };

  // 控制按钮样式 - 添加pointer-events确保可点击
  const buttonClass = "w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center justify-center text-gray-600 hover:text-gray-800 cursor-pointer select-none active:scale-95";
  const disabledButtonClass = "w-10 h-10 bg-gray-100 border border-gray-200 rounded-lg shadow-sm flex items-center justify-center text-gray-400 cursor-not-allowed select-none";

  return (
    <div className="absolute bottom-4 left-4 z-50 flex flex-col space-y-2" style={{ pointerEvents: 'auto' }}>
      {/* 缩放控制组 */}
      <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <div className="flex flex-col space-y-1">
          {/* 放大按钮 */}
          <button
            onClick={handleZoomIn}
            className={buttonClass}
            title="放大 (Ctrl + +)"
          >
            <ZoomIn size={18} />
          </button>

          {/* 缩放级别显示 */}
          <div className="w-10 h-8 flex items-center justify-center text-xs font-medium text-gray-600 bg-gray-50 rounded border">
            {getZoomText()}
          </div>

          {/* 缩小按钮 */}
          <button
            onClick={handleZoomOut}
            className={buttonClass}
            title="缩小 (Ctrl + -)"
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      {/* 视图控制组 */}
      <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <div className="flex flex-col space-y-1">
          {/* 适应视图按钮 */}
          <button
            onClick={handleFitView}
            className={currentMindMap ? buttonClass : disabledButtonClass}
            disabled={!currentMindMap}
            title="适应视图 (Ctrl + 0)"
          >
            <Maximize size={18} />
          </button>

          {/* 居中显示按钮 */}
          <button
            onClick={handleCenterView}
            className={currentMindMap ? buttonClass : disabledButtonClass}
            disabled={!currentMindMap}
            title="居中显示根节点"
          >
            <Move size={18} />
          </button>

          {/* 重置视图按钮 */}
          <button
            onClick={handleResetView}
            className={buttonClass}
            title="重置视图 (1:1 缩放)"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* 展开/折叠控制组 */}
      <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <div className="flex flex-col space-y-1">
          {/* 展开全部按钮 */}
          <button
            onClick={() => expandAll()}
            className={currentMindMap ? buttonClass : disabledButtonClass}
            disabled={!currentMindMap}
            title="展开所有节点"
          >
            <Expand size={18} />
          </button>

          {/* 折叠到一级按钮 */}
          <button
            onClick={() => collapseToLevel(1)}
            className={currentMindMap ? buttonClass : disabledButtonClass}
            disabled={!currentMindMap}
            title="折叠到一级节点"
          >
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      {/* 撤销/重做控制组 */}
      <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <div className="flex flex-col space-y-1">
          {/* 撤销按钮 */}
          <button
            onClick={() => undo()}
            className={canUndo() ? buttonClass : disabledButtonClass}
            disabled={!canUndo()}
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>

          {/* 重做按钮 */}
          <button
            onClick={() => redo()}
            className={canRedo() ? buttonClass : disabledButtonClass}
            disabled={!canRedo()}
            title="重做 (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      {/* 导出控制组 */}
      <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <div className="flex flex-col space-y-1">
          {/* 导出按钮 */}
          <button
            onClick={handleOpenExportPanel}
            className={currentMindMap ? buttonClass : disabledButtonClass}
            disabled={!currentMindMap}
            title="导出思维导图"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* 主题选择器 */}
      <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <ThemeSelector />
      </div>

      {/* 信息显示 */}
      {currentMindMap && (
        <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200 min-w-[120px]">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>节点数:</span>
              <span className="font-medium">{currentMindMap.nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span>层级:</span>
              <span className="font-medium">
                {Math.max(...currentMindMap.nodes.map(n => n.level)) + 1}
              </span>
            </div>
            {viewState.selectedNodeId && (
              <div className="flex justify-between">
                <span>已选中:</span>
                <span className="font-medium text-blue-600">1</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 导出面板 */}
      <ExportPanel
        isOpen={isExportPanelOpen}
        onClose={handleCloseExportPanel}
      />
    </div>
  );
};

export default MindMapControls;