/**
 * 思维导图组件测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Canvas } from '../components/MindMap';
import { useMindMapStore } from '../stores/mindmapStore';
import { MindMapData } from '../types/mindmap';

// 模拟ReactFlow
vi.mock('reactflow', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow-provider">{children}</div>
  ),
  useNodesState: () => [[], () => {}, () => {}],
  useEdgesState: () => [[], () => {}, () => {}],
  useReactFlow: () => ({
    fitView: () => {},
    setCenter: () => {},
    setViewport: () => {},
    getZoom: () => 1,
    getViewport: () => ({ x: 0, y: 0, zoom: 1 })
  }),
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  MiniMap: () => <div data-testid="minimap" />,
  Background: () => <div data-testid="background" />,
  BackgroundVariant: { Dots: 'dots' },
  Handle: () => <div data-testid="handle" />,
  Position: { Left: 'left', Right: 'right' }
}));

describe('思维导图画布组件', () => {
  beforeEach(() => {
    // 重置store状态
    useMindMapStore.getState().clear();
  });

  it('应该显示空状态提示', () => {
    render(<Canvas />);
    
    expect(screen.getByText('暂无思维导图')).toBeInTheDocument();
    expect(screen.getByText('请上传文件或输入内容来生成思维导图')).toBeInTheDocument();
  });

  it('应该显示加载状态', () => {
    // 设置加载状态
    useMindMapStore.getState().setLoading(true);
    
    render(<Canvas />);
    
    expect(screen.getByText('正在加载思维导图...')).toBeInTheDocument();
  });

  it('应该显示错误状态', () => {
    // 设置错误状态
    useMindMapStore.getState().setError('测试错误信息');
    
    render(<Canvas />);
    
    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText('测试错误信息')).toBeInTheDocument();
  });

  it('应该渲染思维导图', () => {
    // 创建测试数据
    const testMindMap: MindMapData = {
      id: 'test-mindmap',
      title: '测试思维导图',
      nodes: [
        {
          id: 'root',
          content: '根节点',
          level: 0,
          parentId: null,
          children: ['child1'],
          position: { x: 0, y: 0 }
        },
        {
          id: 'child1',
          content: '子节点1',
          level: 1,
          parentId: 'root',
          children: [],
          position: { x: 200, y: 100 }
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 设置思维导图数据
    useMindMapStore.getState().setMindMap(testMindMap);
    
    render(<Canvas />);
    
    // 验证ReactFlow组件被渲染
    expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });
});

describe('思维导图Store', () => {
  beforeEach(() => {
    useMindMapStore.getState().clear();
  });

  it('应该能够设置思维导图数据', () => {
    const testData: MindMapData = {
      id: 'test',
      title: '测试',
      nodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(testData);
    
    expect(useMindMapStore.getState().currentMindMap).toEqual(testData);
  });

  it('应该能够添加节点', () => {
    const testData: MindMapData = {
      id: 'test',
      title: '测试',
      nodes: [
        {
          id: 'root',
          content: '根节点',
          level: 0,
          parentId: null,
          children: []
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(testData);
    useMindMapStore.getState().addNode('root', '新节点');
    
    const state = useMindMapStore.getState();
    expect(state.currentMindMap?.nodes).toHaveLength(2);
    expect(state.currentMindMap?.nodes[0].children).toHaveLength(1);
  });

  it('应该能够删除节点', () => {
    const testData: MindMapData = {
      id: 'test',
      title: '测试',
      nodes: [
        {
          id: 'root',
          content: '根节点',
          level: 0,
          parentId: null,
          children: ['child1']
        },
        {
          id: 'child1',
          content: '子节点',
          level: 1,
          parentId: 'root',
          children: []
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(testData);
    useMindMapStore.getState().deleteNode('child1');
    
    const state = useMindMapStore.getState();
    expect(state.currentMindMap?.nodes).toHaveLength(1);
    expect(state.currentMindMap?.nodes[0].children).toHaveLength(0);
  });

  it('应该能够更新节点', () => {
    const testData: MindMapData = {
      id: 'test',
      title: '测试',
      nodes: [
        {
          id: 'root',
          content: '根节点',
          level: 0,
          parentId: null,
          children: []
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(testData);
    useMindMapStore.getState().updateNode('root', { content: '更新后的根节点' });
    
    const state = useMindMapStore.getState();
    expect(state.currentMindMap?.nodes[0].content).toBe('更新后的根节点');
  });

  it('应该能够切换节点折叠状态', () => {
    const testData: MindMapData = {
      id: 'test',
      title: '测试',
      nodes: [
        {
          id: 'root',
          content: '根节点',
          level: 0,
          parentId: null,
          children: ['child1'],
          collapsed: false
        },
        {
          id: 'child1',
          content: '子节点',
          level: 1,
          parentId: 'root',
          children: []
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(testData);
    useMindMapStore.getState().toggleNodeCollapse('root');
    
    const state = useMindMapStore.getState();
    expect(state.currentMindMap?.nodes[0].collapsed).toBe(true);
  });
});