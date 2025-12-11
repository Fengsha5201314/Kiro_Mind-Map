/**
 * 设置状态管理 Store
 * 使用 Zustand 实现应用设置的状态管理，包括API密钥、主题等
 */

import { create } from 'zustand';
import { storageService } from '../services/storageService';

// 支持的Gemini模型列表
// 参考: https://ai.google.dev/gemini-api/docs/models
// 参考: https://ai.google.dev/gemini-api/docs/gemini-3
export const SUPPORTED_MODELS = [
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro 预览版',
    description: '最新Gemini 3系列，性能最强',
    recommended: true
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: '稳定版，速度快性能强',
    recommended: false
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: '轻量版，响应更快',
    recommended: false
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: '稳定的快速模型',
    recommended: false
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: '平衡性能和质量',
    recommended: false
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: '经典稳定版本',
    recommended: false
  }
] as const;

export type SupportedModelId = typeof SUPPORTED_MODELS[number]['id'];

// 设置数据接口
interface Settings {
  theme: 'light' | 'dark';
  language: 'zh-CN';
  autoSave: boolean;
  showMinimap: boolean;
  enableAnimation: boolean;
  maxNodes: number;
  maxDepth: number;
  selectedModel: SupportedModelId;
}

// 默认设置
const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'zh-CN',
  autoSave: true,
  showMinimap: true,
  enableAnimation: true,
  maxNodes: 1000,
  maxDepth: 10,
  selectedModel: 'gemini-3-pro-preview'
};

// Settings Store 接口定义
interface SettingsStore {
  // 状态
  apiKey: string | null;
  apiKeyMask: string | null;
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  
  // API密钥操作
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  loadApiKey: () => Promise<void>;
  hasApiKey: () => Promise<boolean>;
  
  // 设置操作
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setSelectedModel: (model: SupportedModelId) => Promise<void>;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 工具方法
  exportSettings: () => Settings;
  importSettings: (settings: Partial<Settings>) => Promise<void>;
}

// 创建 Settings Store
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // 初始状态
  apiKey: null,
  apiKeyMask: null,
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  // API密钥操作
  setApiKey: async (key: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // 验证API密钥格式
      if (!key || typeof key !== 'string' || key.trim().length === 0) {
        throw new Error('API密钥不能为空');
      }
      
      const trimmedKey = key.trim();
      
      // 基本格式验证（Gemini API密钥通常以AIza开头）
      if (!trimmedKey.startsWith('AIza') && trimmedKey.length < 20) {
        throw new Error('API密钥格式不正确');
      }
      
      // 保存到存储
      await storageService.saveApiKey(trimmedKey);
      
      // 获取掩码版本
      const mask = await storageService.getApiKeyMask();
      
      set({
        apiKey: trimmedKey,
        apiKeyMask: mask,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存API密钥失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  clearApiKey: async () => {
    try {
      set({ isLoading: true, error: null });
      
      await storageService.deleteApiKey();
      
      set({
        apiKey: null,
        apiKeyMask: null,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除API密钥失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  loadApiKey: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const apiKey = await storageService.getApiKey();
      const apiKeyMask = await storageService.getApiKeyMask();
      
      set({
        apiKey,
        apiKeyMask,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载API密钥失败';
      set({
        apiKey: null,
        apiKeyMask: null,
        isLoading: false,
        error: errorMessage
      });
    }
  },

  hasApiKey: async () => {
    try {
      return await storageService.hasApiKey();
    } catch {
      return false;
    }
  },

  // 设置操作
  updateSettings: async (updates: Partial<Settings>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { settings: currentSettings } = get();
      const newSettings = { ...currentSettings, ...updates };
      
      // 验证设置值
      if (newSettings.maxNodes < 1 || newSettings.maxNodes > 10000) {
        throw new Error('最大节点数必须在1-10000之间');
      }
      
      if (newSettings.maxDepth < 1 || newSettings.maxDepth > 20) {
        throw new Error('最大深度必须在1-20之间');
      }
      
      // 保存到存储
      await storageService.saveSettings(newSettings);
      
      set({
        settings: newSettings,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存设置失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  setTheme: async (theme: 'light' | 'dark') => {
    const { updateSettings } = get();
    await updateSettings({ theme });
    
    // 立即应用主题到DOM
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  setSelectedModel: async (model: SupportedModelId) => {
    const { updateSettings } = get();
    await updateSettings({ selectedModel: model });
  },

  resetSettings: async () => {
    try {
      set({ isLoading: true, error: null });
      
      await storageService.saveSettings(DEFAULT_SETTINGS);
      
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        error: null
      });
      
      // 重置主题
      document.documentElement.classList.toggle('dark', DEFAULT_SETTINGS.theme === 'dark');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重置设置失败';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  loadSettings: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const savedSettings = await storageService.getSettings();
      
      // 合并默认设置和保存的设置
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        ...savedSettings
      };
      
      set({
        settings,
        isLoading: false,
        error: null
      });
      
      // 应用主题到DOM
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载设置失败';
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        error: errorMessage
      });
      
      // 应用默认主题
      document.documentElement.classList.toggle('dark', DEFAULT_SETTINGS.theme === 'dark');
    }
  },

  // 状态管理
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // 工具方法
  exportSettings: () => {
    const { settings } = get();
    return { ...settings };
  },

  importSettings: async (importedSettings: Partial<Settings>) => {
    const { updateSettings } = get();
    
    // 验证导入的设置
    const validSettings: Partial<Settings> = {};
    
    if (importedSettings.theme && ['light', 'dark'].includes(importedSettings.theme)) {
      validSettings.theme = importedSettings.theme;
    }
    
    if (typeof importedSettings.autoSave === 'boolean') {
      validSettings.autoSave = importedSettings.autoSave;
    }
    
    if (typeof importedSettings.showMinimap === 'boolean') {
      validSettings.showMinimap = importedSettings.showMinimap;
    }
    
    if (typeof importedSettings.enableAnimation === 'boolean') {
      validSettings.enableAnimation = importedSettings.enableAnimation;
    }
    
    if (typeof importedSettings.maxNodes === 'number' && 
        importedSettings.maxNodes >= 1 && 
        importedSettings.maxNodes <= 10000) {
      validSettings.maxNodes = importedSettings.maxNodes;
    }
    
    if (typeof importedSettings.maxDepth === 'number' && 
        importedSettings.maxDepth >= 1 && 
        importedSettings.maxDepth <= 20) {
      validSettings.maxDepth = importedSettings.maxDepth;
    }
    
    if (Object.keys(validSettings).length > 0) {
      await updateSettings(validSettings);
    }
  }
}));

// 初始化设置（在应用启动时调用）
export const initializeSettings = async () => {
  const store = useSettingsStore.getState();
  await Promise.all([
    store.loadSettings(),
    store.loadApiKey()
  ]);
};

export default useSettingsStore;