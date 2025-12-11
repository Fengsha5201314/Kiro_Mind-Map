/**
 * 存储服务使用示例
 */

import { storageService } from '../services';
import { MindMapData } from '../types/mindmap';

/**
 * 演示API密钥管理
 */
export async function demonstrateApiKeyManagement() {
  console.log('=== API密钥管理演示 ===');
  
  try {
    // 保存API密钥
    const apiKey = 'sk-test123456789abcdef';
    await storageService.saveApiKey(apiKey);
    console.log('✓ API密钥已保存');
    
    // 检查是否存在
    const hasKey = await storageService.hasApiKey();
    console.log('✓ API密钥存在:', hasKey);
    
    // 获取掩码版本
    const mask = await storageService.getApiKeyMask();
    console.log('✓ API密钥掩码:', mask);
    
    // 读取完整密钥
    const retrievedKey = await storageService.getApiKey();
    console.log('✓ 密钥验证:', retrievedKey === apiKey ? '通过' : '失败');
    
  } catch (error) {
    console.error('❌ API密钥管理失败:', error);
  }
}

/**
 * 演示设置管理
 */
export async function demonstrateSettingsManagement() {
  console.log('\n=== 设置管理演示 ===');
  
  try {
    // 保存设置
    const settings = {
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true,
      maxNodes: 1000,
    };
    
    await storageService.saveSettings(settings);
    console.log('✓ 设置已保存');
    
    // 读取设置
    const retrievedSettings = await storageService.getSettings();
    console.log('✓ 设置读取:', JSON.stringify(retrievedSettings, null, 2));
    
  } catch (error) {
    console.error('❌ 设置管理失败:', error);
  }
}

/**
 * 演示思维导图存储
 */
export async function demonstrateMindMapStorage() {
  console.log('\n=== 思维导图存储演示 ===');
  
  try {
    // 创建测试思维导图
    const mindMapData: MindMapData = {
      id: 'demo-mindmap-' + Date.now(),
      title: '演示思维导图',
      nodes: [
        {
          id: 'root',
          content: '中心主题',
          level: 0,
          parentId: null,
          children: ['child1', 'child2'],
        },
        {
          id: 'child1',
          content: '分支1',
          level: 1,
          parentId: 'root',
          children: [],
        },
        {
          id: 'child2',
          content: '分支2',
          level: 1,
          parentId: 'root',
          children: [],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        sourceType: 'text',
        aiModel: 'gemini-pro',
      },
    };
    
    // 保存思维导图
    await storageService.saveMindMap(mindMapData);
    console.log('✓ 思维导图已保存');
    
    // 读取思维导图
    const retrieved = await storageService.getMindMap(mindMapData.id);
    console.log('✓ 思维导图读取:', retrieved ? '成功' : '失败');
    
    // 获取所有思维导图
    const allMindMaps = await storageService.getAllMindMaps();
    console.log('✓ 思维导图总数:', allMindMaps.length);
    
    // 搜索思维导图
    const searchResults = await storageService.searchMindMaps('演示');
    console.log('✓ 搜索结果数量:', searchResults.length);
    
  } catch (error) {
    console.error('❌ 思维导图存储失败:', error);
  }
}

/**
 * 演示存储信息查询
 */
export async function demonstrateStorageInfo() {
  console.log('\n=== 存储信息查询演示 ===');
  
  try {
    // 检查服务可用性
    const availability = await storageService.checkAvailability();
    console.log('✓ 存储服务可用性:', availability);
    
    // 获取存储信息
    const storageInfo = await storageService.getStorageInfo();
    console.log('✓ 存储使用情况:', {
      localStorage: storageInfo.localStorage.usage,
      indexedDB: {
        totalSize: storageInfo.indexedDB.totalSize,
        mindMapCount: storageInfo.indexedDB.mindMapCount,
      },
    });
    
  } catch (error) {
    console.error('❌ 存储信息查询失败:', error);
  }
}

/**
 * 运行所有演示
 */
export async function runAllDemonstrations() {
  console.log('🚀 开始存储服务演示\n');
  
  await demonstrateApiKeyManagement();
  await demonstrateSettingsManagement();
  await demonstrateMindMapStorage();
  await demonstrateStorageInfo();
  
  console.log('\n✅ 存储服务演示完成');
}

// 如果直接运行此文件，执行演示
if (typeof window !== 'undefined') {
  // 浏览器环境
  runAllDemonstrations().catch(console.error);
}