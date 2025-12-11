/**
 * Store 使用示例
 * 展示如何使用思维导图、设置和历史记录Store
 */

import { useMindMapStore, useSettingsStore, useHistoryStore } from '../stores';
import { MindMapData, MindMapNode } from '../types/mindmap';

// 创建示例思维导图数据
function createSampleMindMap(): MindMapData {
  const now = Date.now();
  
  const nodes: MindMapNode[] = [
    {
      id: 'root',
      content: 'AI思维导图生成器',
      level: 0,
      parentId: null,
      children: ['features', 'tech'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'features',
      content: '核心功能',
      level: 1,
      parentId: 'root',
      children: ['upload', 'generate', 'edit'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tech',
      content: '技术栈',
      level: 1,
      parentId: 'root',
      children: ['react', 'zustand', 'gemini'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'upload',
      content: '文件上传',
      level: 2,
      parentId: 'features',
      children: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'generate',
      content: 'AI生成',
      level: 2,
      parentId: 'features',
      children: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'edit',
      content: '编辑功能',
      level: 2,
      parentId: 'features',
      children: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'react',
      content: 'React 18',
      level: 2,
      parentId: 'tech',
      children: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'zustand',
      content: 'Zustand',
      level: 2,
      parentId: 'tech',
      children: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'gemini',
      content: 'Gemini API',
      level: 2,
      parentId: 'tech',
      children: [],
      createdAt: now,
      updatedAt: now
    }
  ];

  return {
    id: 'sample-mindmap',
    title: 'AI思维导图生成器',
    nodes,
    createdAt: now,
    updatedAt: now,
    metadata: {
      sourceType: 'topic',
      aiModel: 'gemini-pro',
      processingTime: 1500
    }
  };
}

// MindMap Store 使用示例
export function mindMapStoreExample() {
  console.log('=== MindMap Store 使用示例 ===');
  
  const mindMapStore = useMindMapStore.getState();
  
  // 1. 设置思维导图
  const sampleData = createSampleMindMap();
  mindMapStore.setMindMap(sampleData);
  console.log('设置思维导图:', mindMapStore.currentMindMap?.title);
  
  // 2. 添加新节点
  mindMapStore.addNode('features', '导出功能');
  console.log('添加节点后的节点数:', mindMapStore.currentMindMap?.nodes.length);
  
  // 3. 更新节点内容
  mindMapStore.updateNode('upload', { content: '多格式文件上传' });
  const updatedNode = mindMapStore.getNodeById('upload');
  console.log('更新后的节点内容:', updatedNode?.content);
  
  // 4. 切换节点折叠状态
  mindMapStore.toggleNodeCollapse('features');
  const featuresNode = mindMapStore.getNodeById('features');
  console.log('features节点折叠状态:', featuresNode?.collapsed);
  
  // 5. 获取根节点
  const rootNodes = mindMapStore.getRootNodes();
  console.log('根节点数量:', rootNodes.length);
  
  // 6. 获取子节点
  const childNodes = mindMapStore.getChildNodes('features');
  console.log('features的子节点数量:', childNodes.length);
  
  // 7. 设置选中节点
  mindMapStore.setSelectedNode('generate');
  console.log('当前选中节点:', mindMapStore.viewState.selectedNodeId);
  
  // 8. 删除节点
  mindMapStore.deleteNode('edit');
  console.log('删除节点后的节点数:', mindMapStore.currentMindMap?.nodes.length);
  
  console.log('MindMap Store 示例完成\n');
}

// Settings Store 使用示例
export async function settingsStoreExample() {
  console.log('=== Settings Store 使用示例 ===');
  
  const settingsStore = useSettingsStore.getState();
  
  // 1. 查看默认设置
  console.log('默认主题:', settingsStore.settings.theme);
  console.log('默认语言:', settingsStore.settings.language);
  
  // 2. 更新设置（模拟，不实际保存）
  try {
    await settingsStore.updateSettings({
      theme: 'dark',
      autoSave: false,
      maxNodes: 500
    });
    console.log('设置更新成功');
    console.log('新主题:', settingsStore.settings.theme);
    console.log('自动保存:', settingsStore.settings.autoSave);
  } catch (error) {
    console.error('设置更新失败:', error);
  }
  
  // 3. 导出设置
  const exportedSettings = settingsStore.exportSettings();
  console.log('导出的设置:', exportedSettings);
  
  // 4. 重置设置
  try {
    await settingsStore.resetSettings();
    console.log('设置重置成功');
    console.log('重置后的主题:', settingsStore.settings.theme);
  } catch (error) {
    console.error('设置重置失败:', error);
  }
  
  console.log('Settings Store 示例完成\n');
}

// History Store 使用示例
export function historyStoreExample() {
  console.log('=== History Store 使用示例 ===');
  
  const historyStore = useHistoryStore.getState();
  
  // 1. 模拟历史记录数据
  const mockHistoryItems: MindMapData[] = [
    {
      id: 'history-1',
      title: '项目规划思维导图',
      nodes: Array.from({ length: 15 }, (_, i) => ({
        id: `node-${i}`,
        content: `节点 ${i + 1}`,
        level: Math.floor(i / 5),
        parentId: i === 0 ? null : `node-${Math.floor((i - 1) / 2)}`,
        children: []
      })),
      createdAt: Date.now() - 86400000, // 1天前
      updatedAt: Date.now() - 3600000,  // 1小时前
      metadata: {
        sourceType: 'file' as const,
        sourceFileName: 'project-plan.pdf'
      }
    },
    {
      id: 'history-2',
      title: '学习笔记整理',
      nodes: Array.from({ length: 23 }, (_, i) => ({
        id: `node-${i}`,
        content: `节点 ${i + 1}`,
        level: Math.floor(i / 5),
        parentId: i === 0 ? null : `node-${Math.floor((i - 1) / 2)}`,
        children: []
      })),
      createdAt: Date.now() - 172800000, // 2天前
      updatedAt: Date.now() - 7200000,   // 2小时前
      metadata: {
        sourceType: 'text' as const
      }
    },
    {
      id: 'history-3',
      title: 'AI技术发展',
      nodes: Array.from({ length: 8 }, (_, i) => ({
        id: `node-${i}`,
        content: `节点 ${i + 1}`,
        level: Math.floor(i / 3),
        parentId: i === 0 ? null : `node-${Math.floor((i - 1) / 2)}`,
        children: []
      })),
      createdAt: Date.now() - 259200000, // 3天前
      updatedAt: Date.now() - 10800000,  // 3小时前
      metadata: {
        sourceType: 'topic' as const
      }
    }
  ];
  
  // 设置模拟数据
  historyStore.mindMaps = mockHistoryItems;
  historyStore.filteredMindMaps = mockHistoryItems;
  
  // 2. 搜索功能
  historyStore.setSearchQuery('项目');
  console.log('搜索"项目"的结果数量:', historyStore.filteredMindMaps.length);
  
  // 3. 获取特定历史记录项
  const item = historyStore.getHistoryItem('history-1');
  console.log('获取的历史记录项:', item?.title);
  
  // 4. 排序功能
  historyStore.sortHistory('createdAt', 'asc');
  console.log('按创建时间升序排序后的第一项:', historyStore.filteredMindMaps[0]?.title);
  
  // 5. 分页功能
  historyStore.setPageSize(2);
  console.log('设置页面大小为2后的总页数:', historyStore.pagination.totalPages);
  
  // 6. 导出历史记录
  const exportedHistory = historyStore.exportHistory();
  console.log('导出的历史记录数量:', exportedHistory.length);
  
  console.log('History Store 示例完成\n');
}

// 综合使用示例
export async function comprehensiveExample() {
  console.log('=== 综合使用示例 ===');
  
  // 1. 初始化设置
  await settingsStoreExample();
  
  // 2. 创建思维导图
  mindMapStoreExample();
  
  // 3. 管理历史记录
  historyStoreExample();
  
  // 4. 模拟完整工作流
  console.log('模拟完整工作流:');
  
  const mindMapStore = useMindMapStore.getState();
  const historyStore = useHistoryStore.getState();
  
  // 创建新的思维导图
  const newMindMap = createSampleMindMap();
  newMindMap.id = 'workflow-example';
  newMindMap.title = '工作流示例';
  
  // 设置到MindMap Store
  mindMapStore.setMindMap(newMindMap);
  console.log('创建思维导图:', newMindMap.title);
  
  // 编辑思维导图
  mindMapStore.addNode('root', '新功能');
  mindMapStore.updateNode('root', { content: 'AI思维导图生成器 v2.0' });
  console.log('编辑完成，节点数:', mindMapStore.currentMindMap?.nodes.length);
  
  // 模拟保存到历史记录
  const updatedMindMap = {
    ...newMindMap,
    updatedAt: Date.now(),
    metadata: {
      ...newMindMap.metadata,
      sourceType: 'topic' as const
    }
  };
  
  historyStore.mindMaps = [updatedMindMap, ...historyStore.mindMaps];
  historyStore.filteredMindMaps = historyStore.mindMaps;
  
  console.log('保存到历史记录，总数:', historyStore.mindMaps.length);
  
  console.log('综合示例完成');
}

// 如果直接运行此文件，执行示例
if (typeof window === 'undefined') {
  // Node.js 环境
  console.log('Store 使用示例');
  console.log('==================');
  
  // 注意：在实际的Node.js环境中，Zustand Store可能需要特殊处理
  // 这里只是展示API的使用方式
  
  mindMapStoreExample();
  historyStoreExample();
  
  // 异步示例需要在async函数中运行
  settingsStoreExample().then(() => {
    console.log('所有示例执行完成');
  }).catch(console.error);
}