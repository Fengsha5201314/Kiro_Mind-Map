/**
 * 自定义思维导图节点组件
 * 支持节点样式定制、折叠/展开功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight, Plus, Edit3 } from 'lucide-react';
import { useMindMapStore } from '../../stores/mindmapStore';
import { MindMapNode } from '../../types/mindmap';

// 节点数据接口
interface NodeData {
  label: string;
  level: number;
  collapsed: boolean;
  nodeData: MindMapNode;
}

// 根据层级获取节点样式
const getNodeStyleByLevel = (level: number) => {
  const styles = [
    // 根节点 (level 0)
    {
      backgroundColor: '#1976d2',
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: 'bold',
      borderRadius: '12px',
      padding: '16px 20px',
      minWidth: '160px',
      boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)'
    },
    // 一级节点 (level 1)
    {
      backgroundColor: '#42a5f5',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '10px',
      padding: '12px 16px',
      minWidth: '140px',
      boxShadow: '0 3px 12px rgba(66, 165, 245, 0.3)'
    },
    // 二级节点 (level 2)
    {
      backgroundColor: '#90caf9',
      color: '#1565c0',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: '8px',
      padding: '10px 14px',
      minWidth: '120px',
      boxShadow: '0 2px 8px rgba(144, 202, 249, 0.3)'
    },
    // 三级及以下节点 (level 3+)
    {
      backgroundColor: '#e3f2fd',
      color: '#1565c0',
      fontSize: '13px',
      fontWeight: 'normal',
      borderRadius: '6px',
      padding: '8px 12px',
      minWidth: '100px',
      boxShadow: '0 1px 4px rgba(227, 242, 253, 0.5)'
    }
  ];

  return styles[Math.min(level, styles.length - 1)];
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
    toggleNodeCollapse,
    getChildNodes,
    viewState,
    setEditingNode
  } = useMindMapStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const nodeStyle = getNodeStyleByLevel(data.level);
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
    if (editValue.trim() && editValue !== data.label) {
      updateNode(id, { content: editValue.trim() });
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
    addNode(id, '新节点');
  };

  // 计算节点样式
  const computedStyle = {
    ...nodeStyle,
    border: selected ? '2px solid #ff9800' : '1px solid rgba(0, 0, 0, 0.1)',
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
            background: '#666',
            width: '8px',
            height: '8px',
            border: '2px solid #fff'
          }}
        />
      )}

      {/* 节点内容区域 */}
      <div className="flex items-center space-x-2">
        {/* 折叠/展开按钮 */}
        {hasChildren && (
          <button
            onClick={handleToggleCollapse}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
            style={{ color: nodeStyle.color }}
          >
            {data.collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        )}

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
          </div>
        )}
      </div>

      {/* 输出连接点 - 有子节点或可以添加子节点时显示 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#666',
          width: '8px',
          height: '8px',
          border: '2px solid #fff'
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