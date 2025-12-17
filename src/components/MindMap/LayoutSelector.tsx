/**
 * 布局选择器组件
 * 允许用户选择不同的思维导图布局模式
 */

import React, { useState } from 'react';
import { Layout, Check } from 'lucide-react';
import {
  LayoutMode,
  LAYOUT_MODE_LABELS,
  LAYOUT_MODE_DESCRIPTIONS,
  LAYOUT_MODE_USE_CASES
} from '../../types/layout';

interface LayoutSelectorProps {
  currentLayout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  disabled?: boolean;
  className?: string;
}

// 布局模式图标（使用简单的SVG表示）
const LayoutIcons: Record<LayoutMode, React.FC<{ className?: string }>> = {
  [LayoutMode.HORIZONTAL_TREE]: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="10" width="4" height="4" rx="1" />
      <rect x="10" y="6" width="4" height="4" rx="1" />
      <rect x="10" y="14" width="4" height="4" rx="1" />
      <rect x="18" y="10" width="4" height="4" rx="1" />
      <line x1="6" y1="12" x2="10" y2="8" />
      <line x1="6" y1="12" x2="10" y2="16" />
      <line x1="14" y1="8" x2="18" y2="12" />
      <line x1="14" y1="16" x2="18" y2="12" />
    </svg>
  ),
  [LayoutMode.VERTICAL_TREE]: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="10" y="2" width="4" height="4" rx="1" />
      <rect x="6" y="10" width="4" height="4" rx="1" />
      <rect x="14" y="10" width="4" height="4" rx="1" />
      <rect x="10" y="18" width="4" height="4" rx="1" />
      <line x1="12" y1="6" x2="8" y2="10" />
      <line x1="12" y1="6" x2="16" y2="10" />
      <line x1="8" y1="14" x2="12" y2="18" />
      <line x1="16" y1="14" x2="12" y2="18" />
    </svg>
  ),
  [LayoutMode.RADIAL]: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="3" />
      <rect x="10" y="1" width="4" height="3" rx="1" />
      <rect x="19" y="10" width="4" height="4" rx="1" />
      <rect x="10" y="20" width="4" height="3" rx="1" />
      <rect x="1" y="10" width="4" height="4" rx="1" />
      <line x1="12" y1="9" x2="12" y2="4" />
      <line x1="15" y1="12" x2="19" y2="12" />
      <line x1="12" y1="15" x2="12" y2="20" />
      <line x1="9" y1="12" x2="5" y2="12" />
    </svg>
  ),
  [LayoutMode.FISHBONE]: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2" />
      <line x1="6" y1="12" x2="10" y2="6" />
      <line x1="6" y1="12" x2="10" y2="18" />
      <line x1="14" y1="12" x2="18" y2="6" />
      <line x1="14" y1="12" x2="18" y2="18" />
      <circle cx="22" cy="12" r="2" fill="currentColor" />
    </svg>
  )
};

const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  currentLayout,
  onLayoutChange,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 所有可用的布局模式
  const allLayouts = Object.values(LayoutMode);

  // 处理布局选择
  const handleLayoutSelect = (layout: LayoutMode) => {
    onLayoutChange(layout);
    setIsOpen(false);
  };

  const CurrentIcon = LayoutIcons[currentLayout];

  return (
    <div className={`relative ${className}`}>
      {/* 选择器按钮 */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        title="切换布局模式"
        className={`
          flex items-center space-x-2 px-3 py-2 
          border rounded-lg transition-colors
          ${disabled
            ? 'bg-gray-50 cursor-not-allowed border-gray-200 text-gray-400'
            : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 text-gray-700'
          }
          ${isOpen ? 'ring-2 ring-blue-200 border-blue-500' : ''}
        `}
      >
        <Layout className="h-4 w-4" />
        <span className="text-sm font-medium">
          {LAYOUT_MODE_LABELS[currentLayout]}
        </span>
        <CurrentIcon className="h-4 w-4" />
      </button>

      {/* 下拉菜单 */}
      {isOpen && !disabled && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 选项列表 */}
          <div className="absolute z-20 right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                选择布局模式
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                不同的布局适用于不同的场景
              </p>
            </div>

            <div className="py-2 max-h-96 overflow-y-auto">
              {allLayouts.map((layout) => {
                const IconComponent = LayoutIcons[layout];
                const isSelected = currentLayout === layout;

                return (
                  <button
                    key={layout}
                    onClick={() => handleLayoutSelect(layout)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                      ${isSelected ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 布局图标 */}
                      <div
                        className={`
                          p-2 rounded-lg border
                          ${isSelected
                            ? 'bg-blue-100 border-blue-300 text-blue-600'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                          }
                        `}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>

                      {/* 布局信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {LAYOUT_MODE_LABELS[layout]}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {LAYOUT_MODE_DESCRIPTIONS[layout]}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {LAYOUT_MODE_USE_CASES[layout]}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 提示：切换布局后会自动重新计算节点位置
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LayoutSelector;
