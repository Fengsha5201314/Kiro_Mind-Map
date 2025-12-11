/**
 * 状态管理 Store 统一导出
 */

// 导出所有Store
export { useMindMapStore } from './mindmapStore';
export { useSettingsStore, initializeSettings } from './settingsStore';
export { useHistoryStore, getPaginatedHistoryItems } from './historyStore';

// 导出类型
export type { default as MindMapStore } from './mindmapStore';
export type { default as SettingsStore } from './settingsStore';
export type { default as HistoryStore } from './historyStore';

// 应用初始化函数
export const initializeStores = async () => {
  // 初始化设置Store（会自动加载API密钥和设置）
  const { initializeSettings } = await import('./settingsStore');
  await initializeSettings();
  
  // 可以在这里添加其他Store的初始化逻辑
  console.log('所有Store初始化完成');
};