/**
 * 思维导图右键上下文菜单组件
 * 提供添加子节点、删除节点、编辑节点等操作
 */

import React, { useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, Copy, Scissors, Clipboard, ChevronRight, ChevronDown } from 'lucide-react';
import { useMindMapStore } from '../../stores/mindmapStore';

// 菜单项接口
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

// 上下文菜单属性
interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  onClose: () => void;
  visible: boolean;
}

// 右键上下文菜单组件
const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
  visible
}) => {
  const {
    addNode,
    deleteNode,
    toggleNodeCollapse,
    getNodeById,
    getChildNodes,
    setEditingNode
  } = useMindMapStore();

  const menuRef = useRef<HTMLDivElement>(null);

  // 获取当前节点信息
  const currentNode = nodeId ? getNodeById(nodeId) : null;
  const hasChildren = nodeId ? getChildNodes(nodeId).length > 0 : false;
  const isRootNode = currentNode?.level === 0;

  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [visible, onClose]);

  // 处理添加子节点
  const handleAddChild = () => {
    if (nodeId) {
      addNode(nodeId, '新节点');
      onClose();
    }
  };

  // 处理编辑节点
  const handleEditNode = () => {
    if (nodeId) {
      setEditingNode(nodeId);
      onClose();
    }
  };

  // 处理删除节点
  const handleDeleteNode = () => {
    if (nodeId && !isRootNode) {
      if (hasChildren) {
        const confirmed = window.confirm('删除此节点将同时删除所有子节点，确定要继续吗？');
        if (!confirmed) return;
      }
      deleteNode(nodeId);
      onClose();
    }
  };

  // 处理折叠/展开节点
  const handleToggleCollapse = () => {
    if (nodeId && hasChildren) {
      toggleNodeCollapse(nodeId);
      onClose();
    }
  };

  // 处理复制节点（暂时只复制文本）
  const handleCopyNode = () => {
    if (currentNode) {
      navigator.clipboard.writeText(currentNode.content);
      onClose();
    }
  };

  // 处理剪切节点
  const handleCutNode = () => {
    if (currentNode && !isRootNode) {
      navigator.clipboard.writeText(currentNode.content);
      deleteNode(nodeId!);
      onClose();
    }
  };

  // 处理粘贴（创建新节点）
  const handlePasteNode = async () => {
    if (nodeId) {
      try {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          addNode(nodeId, text.trim());
        }
        onClose();
      } catch (error) {
        console.error('粘贴失败:', error);
        onClose();
      }
    }
  };

  // 构建菜单项
  const menuItems: MenuItem[] = [
    {
      id: 'add-child',
      label: '添加子节点',
      icon: <Plus size={16} />,
      action: handleAddChild,
      disabled: !nodeId
    },
    {
      id: 'edit',
      label: '编辑节点',
      icon: <Edit3 size={16} />,
      action: handleEditNode,
      disabled: !nodeId
    },
    {
      id: 'separator-1',
      label: '',
      icon: null,
      action: () => {},
      separator: true
    },
    {
      id: 'toggle-collapse',
      label: currentNode?.collapsed ? '展开节点' : '折叠节点',
      icon: currentNode?.collapsed ? <ChevronDown size={16} /> : <ChevronRight size={16} />,
      action: handleToggleCollapse,
      disabled: !hasChildren
    },
    {
      id: 'separator-2',
      label: '',
      icon: null,
      action: () => {},
      separator: true
    },
    {
      id: 'copy',
      label: '复制',
      icon: <Copy size={16} />,
      action: handleCopyNode,
      disabled: !currentNode
    },
    {
      id: 'cut',
      label: '剪切',
      icon: <Scissors size={16} />,
      action: handleCutNode,
      disabled: !currentNode || isRootNode
    },
    {
      id: 'paste',
      label: '粘贴为子节点',
      icon: <Clipboard size={16} />,
      action: handlePasteNode,
      disabled: !nodeId
    },
    {
      id: 'separator-3',
      label: '',
      icon: null,
      action: () => {},
      separator: true
    },
    {
      id: 'delete',
      label: '删除节点',
      icon: <Trash2 size={16} />,
      action: handleDeleteNode,
      disabled: !currentNode || isRootNode
    }
  ];

  // 计算菜单位置，确保不超出视窗
  const getMenuPosition = () => {
    const menuWidth = 200;
    const menuHeight = menuItems.filter(item => !item.separator).length * 40 + menuItems.filter(item => item.separator).length * 10;
    
    let adjustedX = x;
    let adjustedY = y;

    // 检查右边界
    if (x + menuWidth > window.innerWidth) {
      adjustedX = x - menuWidth;
    }

    // 检查下边界
    if (y + menuHeight > window.innerHeight) {
      adjustedY = y - menuHeight;
    }

    // 确保不超出左边界和上边界
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);

    return { x: adjustedX, y: adjustedY };
  };

  if (!visible || !nodeId) {
    return null;
  }

  const position = getMenuPosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      {menuItems.map((item) => {
        if (item.separator) {
          return (
            <div
              key={item.id}
              className="h-px bg-gray-200 my-1 mx-2"
            />
          );
        }

        return (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            className={`
              w-full px-4 py-2 text-left flex items-center space-x-3 text-sm
              ${item.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
              }
              ${item.id === 'delete' && !item.disabled ? 'hover:bg-red-50 hover:text-red-600' : ''}
              transition-colors duration-150
            `}
          >
            <span className="flex-shrink-0">
              {item.icon}
            </span>
            <span className="flex-1">
              {item.label}
            </span>
            {/* 快捷键提示（可选） */}
            {item.id === 'copy' && (
              <span className="text-xs text-gray-400">Ctrl+C</span>
            )}
            {item.id === 'cut' && (
              <span className="text-xs text-gray-400">Ctrl+X</span>
            )}
            {item.id === 'paste' && (
              <span className="text-xs text-gray-400">Ctrl+V</span>
            )}
            {item.id === 'delete' && (
              <span className="text-xs text-gray-400">Del</span>
            )}
          </button>
        );
      })}

      {/* 节点信息显示 */}
      {currentNode && (
        <div className="border-t border-gray-200 mt-2 pt-2 px-4 pb-2">
          <div className="text-xs text-gray-500 space-y-1">
            <div>层级: {currentNode.level}</div>
            <div>子节点: {hasChildren ? getChildNodes(nodeId!).length : 0}</div>
            {currentNode.createdAt && (
              <div>
                创建: {new Date(currentNode.createdAt).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextMenu;