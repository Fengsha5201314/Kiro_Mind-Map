import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { MindMapData } from '../../types/mindmap';



interface LayoutProps {
  children: React.ReactNode;
  mindMaps?: MindMapData[];
  onMindMapSelect?: (mindMap: MindMapData) => void;
  onMindMapDelete?: (id: string) => void;
  onSettingsClick?: () => void;
  onNewMindMapClick?: () => void;
  onExportClick?: () => void;
  onSaveClick?: () => void;
  onHistoryClick?: () => void;
  showSaveButton?: boolean;
  isHistoryLoading?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  mindMaps = [],
  onMindMapSelect,
  onMindMapDelete,
  onSettingsClick,
  onNewMindMapClick,
  onExportClick,
  onSaveClick,
  onHistoryClick,
  showSaveButton = false,
  isHistoryLoading = false,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleHistoryToggle = () => {
    if (onHistoryClick) {
      onHistoryClick();
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleMindMapSelect = (mindMap: MindMapData) => {
    onMindMapSelect?.(mindMap);
    setIsSidebarOpen(false); // 选择后关闭侧边栏
  };

  const handleMindMapDelete = (id: string) => {
    onMindMapDelete?.(id);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* 头部导航栏 */}
      <Header
        onSettingsClick={onSettingsClick}
        onNewMindMapClick={onNewMindMapClick}
        onExportClick={onExportClick}
        onSaveClick={onSaveClick}
        onHistoryToggle={handleHistoryToggle}
        showSaveButton={showSaveButton}
      />

      {/* 主要内容区域 - 使用固定高度计算 */}
      <main className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        {children}
      </main>

      {/* 历史记录侧边栏 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        mindMaps={mindMaps}
        onMindMapSelect={handleMindMapSelect}
        onMindMapDelete={handleMindMapDelete}
        isLoading={isHistoryLoading}
      />
    </div>
  );
};

export default Layout;