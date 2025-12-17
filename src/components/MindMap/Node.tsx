/**
 * 自定义思维导图节点组件
 * 支持节点样式定制、折叠/展开功能、主题配色
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2 } from 'lucide-react';
import { useMindMapStore } from '../../stores/mindmapStore';
import { MindMapNode } from '../../types/mindmap';
import { ThemeColors, getLevelColors } from '../../types/theme';

// 节点数据接口
interface NodeData {
  label: string;
  level: number;
  collapsed: boolean;
  nodeData: MindMapNode;
}

// 根据层级和主题获取节点样式
const getNodeStyleByLevel = (level: number, theme: ThemeColors) => {
  const levelColors = getLevelColors(theme, level);
  
  // 基础样式配置（根据层级调整大小）
  const sizeConfigs = [
    // 根节点 (level 0)
    {
      fontSize: '18px',
      fontWeight: 'bold' as const,
      borderRadius: '12px',
      padding: '16px 24px',
      minWidth: '180px'
    },
    // 一级节点 (level 1)
    {
      fontSize: '16px',
      fontWeight: '600' as const,
      borderRadius: '10px',
      padding: '12px 18px',
      minWidth: '150px'
    },
    // 二级节点 (level 2)
    {
      fontSize: '14px',
      fontWeight: '500' as const,
      borderRadius: '8px',
      padding: '10px 14px',
      minWidth: '130px'
    },
    // 三级及以下节点 (level 3+)
    {
      fontSize: '13px',
      fontWeight: 'normal' as const,
      borderRadius: '6px',
      padding: '8px 12px',
      minWidth: '110px'
    }
  ];

  const sizeConfig = sizeConfigs[Math.min(level, sizeConfigs.length - 1)];

  return {
    backgroundColor: levelColors.backgroundColor,
    color: levelColors.textColor,
    borderColor: levelColors.borderColor,
    ...sizeConfig,
    boxShadow: `0 ${4 - level}px ${12 - level * 2}px rgba(0, 0, 0, 0.15)`
  };
};

// 自定义思维导图节点组件
const MindMapNodeComponent: React.FC<NodeProps<NodeData>> = ({ 
  data, 
  selected, 
  id 
}) => {
  const {
    updateNode,
    addNode,
    deleteNode,
    toggleNodeCollapse,
    getChildNodes,
    viewState,
    setEditingNode,
    currentTheme
  } = useMindMapStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // 使用主题配色
  const nodeStyle = useMemo(() => getNodeStyleByLevel(data.level, currentTheme), [data.level, currentTheme]);
  const hasChildren = getChildNodes(id).length > 0;
  const isEditingThis = viewState.editingNodeId === id;

  // 处理编辑状态变化
  useEffect(() => {
    if (isEditingThis && !isEditing) {
      setIsEditing(true);
      setEditValue(data.label);
    } else if (!isEditingThis && isEditing) {
      setIsEditing(false);
    }
  }, [isEditingThis, isEditing, data.label]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 处理双击编辑
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNode(id);
  };

  // 处理编辑完成
  const handleEditComplete = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== data.label) {
      // 更新节点内容，同时更新 content 字段
      updateNode(id, { content: trimmedValue });
      // 强制更新本地显示值
      setEditValue(trimmedValue);
    } else if (!trimmedValue) {
      // 如果输入为空，恢复原值
      setEditValue(data.label);
    }
    setIsEditing(false);
    setEditingNode(undefined);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditComplete();
    } else if (e.key === 'Escape') {
      setEditValue(data.label);
      setIsEditing(false);
      setEditingNode(undefined);
    }
  };

  // 处理输入框失焦
  const handleBlur = () => {
    handleEditComplete();
  };

  // 处理折叠/展开
  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleNodeCollapse(id);
    }
  };

  // 处理添加子节点
  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('添加子节点到:', id);
    addNode(id, '新节点');
  };

  // 处理删除节点
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // 不允许删除根节点
    if (data.level === 0) {
      console.log('不能删除根节点');
      return;
    }
    console.log('删除节点:', id);
    deleteNode(id);
  };

  // 计算节点样式
  const computedStyle = {
    ...nodeStyle,
    border: selected 
      ? `3px solid ${currentTheme.selectedBorderColor}` 
      : `2px solid ${nodeStyle.borderColor}`,
    transform: selected ? 'scale(1.02)' : 'scale(1)',
    transition: 'all 0.2s ease-in-out',
    cursor: isEditing ? 'text' : 'pointer',
    position: 'relative' as const
  };

  return (
    <div
      style={computedStyle}
      onDoubleClick={handleDoubleClick}
      className="group relative"
    >
      {/* 输入连接点 - 只有非根节点才显示 */}
      {data.level > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: '#64748b',
            width: '10px',
            height: '10px',
            border: '2px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        />
      )}

      {/* 折叠/展开按钮 - 放在节点外部右侧，更容易点击 */}
      {hasChildren && (
        <button
          onClick={handleToggleCollapse}
          onMouseDown={(e) => e.stopPropagation()} // 阻止拖拽
          className="absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white border-2 shadow-md hover:scale-110 transition-transform z-10"
          style={{ 
            borderColor: nodeStyle.borderColor,
            color: nodeStyle.backgroundColor
          }}
          title={data.collapsed ? '展开子节点' : '折叠子节点'}
        >
          {data.collapsed ? (
            <ChevronRight size={12} strokeWidth={3} />
          ) : (
            <ChevronDown size={12} strokeWidth={3} />
          )}
        </button>
      )}

      {/* 节点内容区域 */}
      <div className="flex items-center space-x-2">

        {/* 节点文本内容 */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-full bg-transparent border-none outline-none"
              style={{
                color: nodeStyle.color,
                fontSize: nodeStyle.fontSize,
                fontWeight: nodeStyle.fontWeight
              }}
            />
          ) : (
            <span
              className="block truncate"
              title={data.label}
            >
              {data.label}
            </span>
          )}
        </div>

        {/* 悬停时显示的操作按钮 */}
        {!isEditing && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
            <button
              onClick={handleAddChild}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              style={{ color: nodeStyle.color }}
              title="添加子节点"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingNode(id);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              style={{ color: nodeStyle.color }}
              title="编辑节点"
            >
              <Edit3 size={12} />
            </button>
            {/* 删除按钮 - 非根节点才显示 */}
            {data.level > 0 && (
              <button
                onClick={handleDelete}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500 hover:bg-opacity-20 transition-colors"
                style={{ color: '#ef4444' }}
                title="删除节点"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 输出连接点 - 有子节点或可以添加子节点时显示 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#64748b',
          width: '10px',
          height: '10px',
          border: '2px solid #fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}
      />

      {/* 层级指示器 */}
      {selected && (
        <div
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: '#ff9800',
            color: '#fff'
          }}
        >
          {data.level}
        </div>
      )}
    </div>
  );
};

export default MindMapNodeComponent;