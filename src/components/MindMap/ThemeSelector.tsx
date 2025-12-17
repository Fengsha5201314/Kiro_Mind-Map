/**
 * 思维导图主题选择器组件
 * 提供多种高端配色方案供用户选择
 */

import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useMindMapStore } from '../../stores/mindmapStore';

const ThemeSelector: React.FC = () => {
  const { currentTheme, availableThemes, setTheme } = useMindMapStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* 主题切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center justify-center text-gray-600 hover:text-gray-800 cursor-pointer select-none active:scale-95"
        title="切换主题配色"
      >
        <Palette size={18} />
      </button>

      {/* 主题选择面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 选择面板 */}
          <div className="absolute left-12 bottom-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[240px]">
            <div className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">
              选择主题配色
            </div>
            
            <div className="space-y-2">
              {availableThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`w-full flex items-center p-2 rounded-lg transition-all ${
                    currentTheme.id === theme.id 
                      ? 'bg-blue-50 border-2 border-blue-400' 
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  {/* 颜色预览 */}
                  <div className="flex -space-x-1 mr-3">
                    {theme.levels.map((level, index) => (
                      <div
                        key={index}
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: level.backgroundColor }}
                      />
                    ))}
                  </div>
                  
                  {/* 主题信息 */}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-800">
                      {theme.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {theme.description}
                    </div>
                  </div>
                  
                  {/* 选中标记 */}
                  {currentTheme.id === theme.id && (
                    <Check size={16} className="text-blue-500 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;
