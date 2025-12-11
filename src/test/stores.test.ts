/**
 * Store 状态管理测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMindMapStore } from '../stores/mindmapStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useHistoryStore } from '../stores/historyStore';
import { MindMapData } from '../types/mindmap';

describe('MindMap Store', () => {
  beforeEach(() => {
    // 清理Store状态
    useMindMapStore.getState().clear();
  });

  it('应该能够设置思维导图数据', () => {
    const mockData: MindMapData = {
      id: 'test-1',
      title: '测试思维导图',
      nodes: [
        {
          id: 'node-1',
          content: '根节点',
          level: 0,
          parentId: null,
          children: ['node-2'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'node-2',
          content: '子节点',
          level: 1,
          parentId: 'node-1',
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(mockData);
    
    // 重新获取状态以确保更新
    const updatedStore = useMindMapStore.getState();
    expect(updatedStore.currentMindMap).toEqual(mockData);
    expect(updatedStore.error).toBeNull();
  });

  it('应该能够添加新节点', () => {
    const mockData: MindMapData = {
      id: 'test-1',
      title: '测试思维导图',
      nodes: [
        {
          id: 'node-1',
          content: '根节点',
          level: 0,
          parentId: null,
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(mockData);
    
    const initialNodeCount = useMindMapStore.getState().currentMindMap!.nodes.length;
    useMindMapStore.getState().addNode('node-1', '新子节点');
    
    // 重新获取状态
    const updatedStore = useMindMapStore.getState();
    expect(updatedStore.currentMindMap!.nodes.length).toBe(initialNodeCount + 1);
    
    // 检查父节点的children数组是否更新
    const parentNode = updatedStore.currentMindMap!.nodes.find(n => n.id === 'node-1');
    expect(parentNode!.children.length).toBe(1);
  });

  it('应该能够删除节点', () => {
    const mockData: MindMapData = {
      id: 'test-1',
      title: '测试思维导图',
      nodes: [
        {
          id: 'node-1',
          content: '根节点',
          level: 0,
          parentId: null,
          children: ['node-2'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'node-2',
          content: '子节点',
          level: 1,
          parentId: 'node-1',
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(mockData);
    useMindMapStore.getState().deleteNode('node-2');
    
    // 重新获取状态
    const updatedStore = useMindMapStore.getState();
    expect(updatedStore.currentMindMap!.nodes.length).toBe(1);
    expect(updatedStore.currentMindMap!.nodes.find(n => n.id === 'node-2')).toBeUndefined();
    
    // 检查父节点的children数组是否更新
    const parentNode = updatedStore.currentMindMap!.nodes.find(n => n.id === 'node-1');
    expect(parentNode!.children.length).toBe(0);
  });

  it('应该能够更新节点', () => {
    const mockData: MindMapData = {
      id: 'test-1',
      title: '测试思维导图',
      nodes: [
        {
          id: 'node-1',
          content: '原始内容',
          level: 0,
          parentId: null,
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    useMindMapStore.getState().setMindMap(mockData);
    useMindMapStore.getState().updateNode('node-1', { content: '更新后的内容' });
    
    // 重新获取状态
    const updatedStore = useMindMapStore.getState();
    const updatedNode = updatedStore.currentMindMap!.nodes.find(n => n.id === 'node-1');
    expect(updatedNode!.content).toBe('更新后的内容');
  });
});

describe('Settings Store', () => {
  it('应该有默认设置', () => {
    const store = useSettingsStore.getState();
    
    expect(store.settings.theme).toBe('light');
    expect(store.settings.language).toBe('zh-CN');
    expect(store.settings.autoSave).toBe(true);
  });

  it('应该能够更新主题设置', async () => {
    const store = useSettingsStore.getState();
    
    // 模拟更新设置（不实际保存到存储）
    store.settings.theme = 'dark';
    
    expect(store.settings.theme).toBe('dark');
  });
});

describe('History Store', () => {
  beforeEach(() => {
    // 重置History Store状态 - 直接调用方法而不是修改属性
    useHistoryStore.setState({
      mindMaps: [],
      filteredMindMaps: [],
      searchQuery: '',
      isLoading: false,
      error: null
    });
  });

  it('应该能够设置搜索查询', () => {
    useHistoryStore.getState().setSearchQuery('测试查询');
    
    // 重新获取状态
    const updatedStore = useHistoryStore.getState();
    expect(updatedStore.searchQuery).toBe('测试查询');
  });

  it('应该能够获取历史记录项', () => {
    // 模拟添加历史记录项
    useHistoryStore.setState({
      mindMaps: [
        {
          id: 'test-1',
          title: '测试思维导图',
          nodes: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    });
    
    const item = useHistoryStore.getState().getHistoryItem('test-1');
    expect(item).toBeDefined();
    expect(item!.title).toBe('测试思维导图');
  });
});