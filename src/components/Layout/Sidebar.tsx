import React from 'react';
import { X, Clock, Trash2, FileText } from 'lucide-react';
import { MindMapData } from '../../types/mindmap';
import { formatDateToChinese } from '../../utils/dateFormatter';



interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mindMaps: MindMapData[];
  onMindMapSelect: (mindMap: MindMapData) => void;
  onMindMapDelete: (id: string) => void;
  isLoading?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  mindMaps,
  onMindMapSelect,
  onMindMapDelete,
  isLoading = false,
}) => {


  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            历史记录
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 侧边栏内容 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : mindMaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <FileText className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-center">暂无历史记录</p>
              <p className="text-sm text-center mt-2">创建您的第一个思维导图吧！</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {mindMaps.map((mindMap) => (
                <div
                  key={mindMap.id}
                  className="group bg-gray-50 hover:bg-gray-100 rounded-lg p-3 cursor-pointer transition-colors border border-gray-200"
                >
                  <div
                    onClick={() => onMindMapSelect(mindMap)}
                    className="flex-1"
                  >
                    <h3 className="font-medium text-gray-900 truncate mb-1">
                      {mindMap.title || '未命名思维导图'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {formatDateToChinese(mindMap.updatedAt)}
                    </p>
                    <div className="flex items-center text-xs text-gray-400">
                      <span>{mindMap.nodes.length} 个节点</span>
                      {mindMap.metadata?.sourceType && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{mindMap.metadata.sourceType}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 删除按钮 */}
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMindMapDelete(mindMap.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;