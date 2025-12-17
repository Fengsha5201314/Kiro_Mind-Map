/**
 * 导出面板组件
 * 支持多种格式导出思维导图
 */

import React, { useState } from 'react';
import { useMindMapStore } from '../../stores/mindmapStore';
import { exportService, EXPORT_FORMATS, EXPORT_STYLES, ExportFormat, ExportStyle, ExportOptions, NodePosition } from '../../services/exportService';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose }) => {
  const { currentMindMap, currentTheme } = useMindMapStore();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ExportStyle>('theme');

  // 处理导出
  const handleExport = async (format: ExportFormat) => {
    if (!currentMindMap) {
      setError('没有可导出的思维导图');
      return;
    }

    setExporting(format);
    setError(null);

    try {
      const formatInfo = EXPORT_FORMATS.find(f => f.id === format);
      const filename = `${currentMindMap.title || '思维导图'}${formatInfo?.extension || '.txt'}`;
      
      // 构建导出选项
      const options: ExportOptions = {
        style: selectedStyle,
        theme: currentTheme
      };
      
      // 如果选择"当前主题"样式，尝试获取页面上的实际节点位置
      if (selectedStyle === 'theme' && (format === 'svg' || format === 'png')) {
        const nodePositions = getActualNodePositions();
        if (nodePositions.length > 0) {
          options.nodePositions = nodePositions;
        }
      }
      
      const blob = await exportService.export(currentMindMap, format, options);
      exportService.downloadFile(blob, filename);
      
      // 导出成功后关闭面板
      setTimeout(() => {
        setExporting(null);
        onClose();
      }, 500);
    } catch (err) {
      console.error('导出失败:', err);
      setError(err instanceof Error ? err.message : '导出失败');
      setExporting(null);
    }
  };
  
  // 获取页面上实际渲染的节点位置
  // 优先使用 store 中保存的位置，如果没有则从 DOM 获取
  const getActualNodePositions = (): NodePosition[] => {
    if (!currentMindMap) return [];
    
    const positions: NodePosition[] = [];
    
    // 首先尝试从 store 中的节点数据获取位置
    // 这些位置是用户拖拽后保存的实际位置
    const nodesWithPosition = currentMindMap.nodes.filter(n => n.position);
    
    if (nodesWithPosition.length > 0) {
      // 使用 store 中的位置数据
      currentMindMap.nodes.forEach(node => {
        if (node.position) {
          // 估算节点宽度（与 Canvas.tsx 中的算法一致）
          let charUnits = 0;
          for (const char of node.content) {
            charUnits += char.charCodeAt(0) > 127 ? 2 : 1;
          }
          const estimatedWidth = charUnits * 7 + 50;
          const width = Math.min(Math.max(estimatedWidth, 120), 350);
          
          positions.push({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            width: width,
            height: 50
          });
        }
      });
      
      return positions;
    }
    
    // 如果 store 中没有位置数据，从 DOM 获取
    const nodeElements = document.querySelectorAll('.react-flow__node');
    
    nodeElements.forEach((el) => {
      const nodeId = el.getAttribute('data-id');
      if (!nodeId) return;
      
      // 获取节点的 transform 位置
      const style = window.getComputedStyle(el);
      const transform = style.transform;
      
      let x = 0, y = 0;
      if (transform && transform !== 'none') {
        // 解析 transform: translate(x, y) 或 matrix(...)
        const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
        if (matrixMatch) {
          const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
          x = values[4] || 0;
          y = values[5] || 0;
        }
      }
      
      // 获取节点尺寸
      const rect = el.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      positions.push({ id: nodeId, x, y, width, height });
    });
    
    return positions;
  };

  if (!isOpen) return null;

  // 按类别分组格式
  const sourceFormats = EXPORT_FORMATS.filter(f => f.category === 'source');
  const imageFormats = EXPORT_FORMATS.filter(f => f.category === 'image');
  const otherFormats = EXPORT_FORMATS.filter(f => !['source', 'image'].includes(f.category));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* 面板内容 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">导出思维导图</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 图片导出样式选择 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              图片导出样式（SVG/PNG）
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {EXPORT_STYLES.map(style => {
                // 如果是"当前主题"样式，使用实际的主题颜色作为预览
                const previewColors = style.id === 'theme' && currentTheme
                  ? currentTheme.levels.slice(0, 4).map(l => l.backgroundColor)
                  : style.preview;
                
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* 颜色预览 */}
                    <div className="flex justify-center gap-0.5 mb-2">
                      {previewColors.map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-medium text-gray-700">{style.name}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {selectedStyle === 'theme' 
                ? `使用当前主题「${currentTheme?.name || '默认'}」的配色和布局导出`
                : EXPORT_STYLES.find(s => s.id === selectedStyle)?.description}
            </p>
          </div>

          {/* 源文件格式 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              源文件格式（可二次编辑）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sourceFormats.map(format => (
                <FormatCard
                  key={format.id}
                  format={format}
                  isExporting={exporting === format.id}
                  onExport={() => handleExport(format.id)}
                />
              ))}
            </div>
          </div>

          {/* 图片格式 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              图片格式（适合分享）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {imageFormats.map(format => (
                <FormatCard
                  key={format.id}
                  format={format}
                  isExporting={exporting === format.id}
                  onExport={() => handleExport(format.id)}
                />
              ))}
            </div>
          </div>

          {/* 其他格式 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              其他格式
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherFormats.map(format => (
                <FormatCard
                  key={format.id}
                  format={format}
                  isExporting={exporting === format.id}
                  onExport={() => handleExport(format.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <p className="text-xs text-gray-500">
            💡 提示：推荐使用 <strong>FreeMind (.mm)</strong> 或 <strong>OPML</strong> 格式，
            兼容 XMind、MindManager、WPS 等主流思维导图软件。
          </p>
        </div>
      </div>
    </div>
  );
};

// 格式卡片组件
interface FormatCardProps {
  format: typeof EXPORT_FORMATS[0];
  isExporting: boolean;
  onExport: () => void;
}

const FormatCard: React.FC<FormatCardProps> = ({ format, isExporting, onExport }) => {
  return (
    <button
      onClick={onExport}
      disabled={isExporting}
      className={`
        p-4 rounded-lg border text-left transition-all
        ${isExporting 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-800">{format.name}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {format.extension}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{format.description}</p>
          <div className="flex flex-wrap gap-1">
            {format.compatible.slice(0, 3).map(app => (
              <span 
                key={app} 
                className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded"
              >
                {app}
              </span>
            ))}
            {format.compatible.length > 3 && (
              <span className="text-xs text-gray-400">
                +{format.compatible.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="ml-3">
          {isExporting ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center text-gray-400 group-hover:text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default ExportPanel;
