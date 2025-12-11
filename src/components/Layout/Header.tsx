import React from 'react';
import { Settings, FileText, Download, Plus, Save } from 'lucide-react';

interface HeaderProps {
  onSettingsClick?: () => void;
  onNewMindMapClick?: () => void;
  onExportClick?: () => void;
  onSaveClick?: () => void;
  onHistoryToggle?: () => void;
  showSaveButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onNewMindMapClick,
  onExportClick,
  onSaveClick,
  onHistoryToggle,
  showSaveButton = false,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左侧：Logo和标题 */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                AI思维导图生成器
              </h1>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-4">
            {/* 新建思维导图按钮 */}
            <button
              onClick={onNewMindMapClick}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              新建
            </button>

            {/* 保存按钮 */}
            {showSaveButton && (
              <button
                onClick={onSaveClick}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Save className="h-4 w-4 mr-1" />
                保存
              </button>
            )}

            {/* 导出按钮 */}
            <button
              onClick={onExportClick}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              导出
            </button>

            {/* 历史记录按钮 */}
            <button
              onClick={onHistoryToggle}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FileText className="h-4 w-4 mr-1" />
              历史记录
            </button>

            {/* 设置按钮 */}
            <button
              onClick={onSettingsClick}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;