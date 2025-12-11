/**
 * 本地存储服务
 * 提供API密钥和设置数据的安全存储功能
 */

import { encryptData, decryptData, validateEncryptedData, CryptoError } from '../utils/crypto';
import { STORAGE_KEYS, StorageResult, StorageInfo } from '../types/storage';
import { MindMapData } from '../types/mindmap';

// 存储服务错误类
export class StorageServiceError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'StorageServiceError';
  }
}

/**
 * 检查LocalStorage是否可用
 * @returns 是否可用
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取LocalStorage使用情况
 * @returns 存储使用统计
 */
function getStorageUsage(): { used: number; available: number } {
  if (!isLocalStorageAvailable()) {
    return { used: 0, available: 0 };
  }

  let used = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // 估算可用空间（大多数浏览器限制为5-10MB）
  const estimated = 5 * 1024 * 1024; // 5MB
  return {
    used,
    available: Math.max(0, estimated - used),
  };
}

/**
 * 安全地设置LocalStorage项目
 * @param key 键名
 * @param value 值
 * @returns 操作结果
 */
async function setStorageItem(key: string, value: string): Promise<StorageResult<void>> {
  try {
    if (!isLocalStorageAvailable()) {
      throw new StorageServiceError('LocalStorage不可用', 'STORAGE_UNAVAILABLE');
    }

    const usage = getStorageUsage();
    const estimatedSize = key.length + value.length;
    
    if (estimatedSize > usage.available) {
      throw new StorageServiceError('存储空间不足', 'QUOTA_EXCEEDED', {
        required: estimatedSize,
        available: usage.available,
      });
    }

    localStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    if (error instanceof StorageServiceError) {
      return {
        success: false,
        error: {
          type: error.code === 'QUOTA_EXCEEDED' ? 'quota_exceeded' : 'access_denied',
          message: error.message,
          details: error.details,
        },
      };
    }

    return {
      success: false,
      error: {
        type: 'unknown',
        message: '存储操作失败',
        details: error,
      },
    };
  }
}

/**
 * 安全地获取LocalStorage项目
 * @param key 键名
 * @returns 操作结果
 */
async function getStorageItem(key: string): Promise<StorageResult<string | null>> {
  try {
    if (!isLocalStorageAvailable()) {
      throw new StorageServiceError('LocalStorage不可用', 'STORAGE_UNAVAILABLE');
    }

    const value = localStorage.getItem(key);
    return { success: true, data: value };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'access_denied',
        message: '读取存储数据失败',
        details: error,
      },
    };
  }
}

/**
 * 安全地删除LocalStorage项目
 * @param key 键名
 * @returns 操作结果
 */
async function removeStorageItem(key: string): Promise<StorageResult<void>> {
  try {
    if (!isLocalStorageAvailable()) {
      throw new StorageServiceError('LocalStorage不可用', 'STORAGE_UNAVAILABLE');
    }

    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'access_denied',
        message: '删除存储数据失败',
        details: error,
      },
    };
  }
}

/**
 * LocalStorage存储服务类
 */
export class LocalStorageService {
  /**
   * 保存API密钥（加密存储）
   * @param apiKey API密钥
   */
  async saveApiKey(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new StorageServiceError('API密钥不能为空', 'INVALID_API_KEY');
    }

    try {
      // 加密API密钥
      const encryptedKey = await encryptData(apiKey.trim());
      
      // 存储到LocalStorage
      const result = await setStorageItem(STORAGE_KEYS.API_KEY, encryptedKey);
      
      if (!result.success) {
        throw new StorageServiceError(
          result.error?.message || 'API密钥保存失败',
          'SAVE_FAILED',
          result.error
        );
      }
    } catch (error) {
      if (error instanceof CryptoError) {
        throw new StorageServiceError('API密钥加密失败', 'ENCRYPTION_FAILED', error);
      }
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('API密钥保存失败', 'SAVE_FAILED', error);
    }
  }

  /**
   * 获取API密钥（解密）
   * @returns API密钥或null
   */
  async getApiKey(): Promise<string | null> {
    try {
      // 从LocalStorage读取加密数据
      const result = await getStorageItem(STORAGE_KEYS.API_KEY);
      
      if (!result.success) {
        throw new StorageServiceError(
          result.error?.message || 'API密钥读取失败',
          'READ_FAILED',
          result.error
        );
      }

      const encryptedKey = result.data;
      if (!encryptedKey) {
        return null;
      }

      // 验证加密数据格式
      if (!validateEncryptedData(encryptedKey)) {
        throw new StorageServiceError('API密钥数据已损坏', 'CORRUPTED_DATA');
      }

      // 解密API密钥
      const decryptedKey = await decryptData(encryptedKey);
      return decryptedKey || null;
    } catch (error) {
      if (error instanceof CryptoError) {
        // 解密失败，可能是数据损坏，删除无效数据
        await this.deleteApiKey();
        return null;
      }
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('API密钥读取失败', 'READ_FAILED', error);
    }
  }

  /**
   * 删除API密钥
   */
  async deleteApiKey(): Promise<void> {
    try {
      const result = await removeStorageItem(STORAGE_KEYS.API_KEY);
      
      if (!result.success) {
        throw new StorageServiceError(
          result.error?.message || 'API密钥删除失败',
          'DELETE_FAILED',
          result.error
        );
      }
    } catch (error) {
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('API密钥删除失败', 'DELETE_FAILED', error);
    }
  }

  /**
   * 验证API密钥是否存在
   * @returns 是否存在API密钥
   */
  async hasApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return apiKey !== null && apiKey.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取API密钥的掩码版本（用于显示）
   * @returns 掩码版本的API密钥
   */
  async getApiKeyMask(): Promise<string | null> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return null;
      }

      // 显示前4个字符和后4个字符，中间用星号替换
      if (apiKey.length <= 8) {
        return '*'.repeat(apiKey.length);
      }

      const prefix = apiKey.substring(0, 4);
      const suffix = apiKey.substring(apiKey.length - 4);
      // 固定使用3个星号，不管实际长度
      const maskLength = 3;
      
      return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
    } catch {
      return null;
    }
  }

  /**
   * 保存设置数据
   * @param settings 设置对象
   */
  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      const settingsJson = JSON.stringify(settings);
      const result = await setStorageItem(STORAGE_KEYS.SETTINGS, settingsJson);
      
      if (!result.success) {
        throw new StorageServiceError(
          result.error?.message || '设置保存失败',
          'SAVE_FAILED',
          result.error
        );
      }
    } catch (error) {
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('设置保存失败', 'SAVE_FAILED', error);
    }
  }

  /**
   * 获取设置数据
   * @returns 设置对象
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      const result = await getStorageItem(STORAGE_KEYS.SETTINGS);
      
      if (!result.success) {
        throw new StorageServiceError(
          result.error?.message || '设置读取失败',
          'READ_FAILED',
          result.error
        );
      }

      const settingsJson = result.data;
      if (!settingsJson) {
        return {};
      }

      return JSON.parse(settingsJson);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // JSON解析失败，返回空设置
        return {};
      }
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('设置读取失败', 'READ_FAILED', error);
    }
  }

  /**
   * 删除设置数据
   */
  async deleteSettings(): Promise<void> {
    try {
      const result = await removeStorageItem(STORAGE_KEYS.SETTINGS);
      
      if (!result.success) {
        throw new StorageServiceError(
          result.error?.message || '设置删除失败',
          'DELETE_FAILED',
          result.error
        );
      }
    } catch (error) {
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('设置删除失败', 'DELETE_FAILED', error);
    }
  }

  /**
   * 清空所有LocalStorage数据
   */
  async clearAll(): Promise<void> {
    try {
      if (!isLocalStorageAvailable()) {
        throw new StorageServiceError('LocalStorage不可用', 'STORAGE_UNAVAILABLE');
      }

      // 只删除应用相关的键
      const keysToRemove = Object.values(STORAGE_KEYS);
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      if (error instanceof StorageServiceError) {
        throw error;
      }
      throw new StorageServiceError('清空数据失败', 'CLEAR_FAILED', error);
    }
  }

  /**
   * 获取存储使用情况
   * @returns 存储统计信息
   */
  async getStorageInfo(): Promise<{
    available: boolean;
    usage: { used: number; available: number };
    keys: string[];
  }> {
    const available = isLocalStorageAvailable();
    const usage = getStorageUsage();
    
    // 获取应用相关的键
    const keys = Object.values(STORAGE_KEYS).filter(key => {
      try {
        return localStorage.getItem(key) !== null;
      } catch {
        return false;
      }
    });

    return {
      available,
      usage,
      keys,
    };
  }
}

/**
 * 统一存储服务
 * 整合LocalStorage和IndexedDB功能
 */
export class UnifiedStorageService {
  private localStorage: LocalStorageService;
  private indexedDB: any; // 动态导入的IndexedDBService

  constructor() {
    this.localStorage = new LocalStorageService();
    this.indexedDB = null as any; // 将在需要时初始化
  }

  private async ensureIndexedDB() {
    if (!this.indexedDB) {
      const { IndexedDBService } = await import('./indexedDBService');
      this.indexedDB = new IndexedDBService();
    }
    return this.indexedDB;
  }

  // API密钥相关方法（使用LocalStorage）
  async saveApiKey(apiKey: string): Promise<void> {
    return this.localStorage.saveApiKey(apiKey);
  }

  async getApiKey(): Promise<string | null> {
    return this.localStorage.getApiKey();
  }

  async deleteApiKey(): Promise<void> {
    return this.localStorage.deleteApiKey();
  }

  async hasApiKey(): Promise<boolean> {
    return this.localStorage.hasApiKey();
  }

  async getApiKeyMask(): Promise<string | null> {
    return this.localStorage.getApiKeyMask();
  }

  // 设置相关方法（使用LocalStorage）
  async saveSettings(settings: Record<string, any>): Promise<void> {
    return this.localStorage.saveSettings(settings);
  }

  async getSettings(): Promise<Record<string, any>> {
    return this.localStorage.getSettings();
  }

  async deleteSettings(): Promise<void> {
    return this.localStorage.deleteSettings();
  }

  // 思维导图相关方法（使用IndexedDB）
  async saveMindMap(data: MindMapData): Promise<void> {
    const indexedDB = await this.ensureIndexedDB();
    return indexedDB.saveMindMap(data);
  }

  async getMindMap(id: string): Promise<MindMapData | null> {
    const indexedDB = await this.ensureIndexedDB();
    return indexedDB.getMindMap(id);
  }

  async getAllMindMaps(): Promise<MindMapData[]> {
    const indexedDB = await this.ensureIndexedDB();
    return indexedDB.getAllMindMaps();
  }

  async deleteMindMap(id: string): Promise<void> {
    const indexedDB = await this.ensureIndexedDB();
    return indexedDB.deleteMindMap(id);
  }

  async searchMindMaps(query: string): Promise<MindMapData[]> {
    const indexedDB = await this.ensureIndexedDB();
    return indexedDB.searchMindMaps(query);
  }

  async getMindMapsPaginated(offset?: number, limit?: number) {
    const indexedDB = await this.ensureIndexedDB();
    return indexedDB.getMindMapsPaginated(offset, limit);
  }

  // 综合存储信息
  async getStorageInfo(): Promise<{
    localStorage: any;
    indexedDB: StorageInfo;
  }> {
    const localStorageInfo = await this.localStorage.getStorageInfo();
    const indexedDB = await this.ensureIndexedDB();
    const indexedDBInfo = await indexedDB.getStorageInfo();

    return {
      localStorage: localStorageInfo,
      indexedDB: indexedDBInfo,
    };
  }

  // 清空所有数据
  async clearAll(): Promise<void> {
    await this.localStorage.clearAll();
    try {
      const indexedDB = await this.ensureIndexedDB();
      await indexedDB.clearAll();
    } catch (error) {
      // IndexedDB清空失败不影响LocalStorage清空
      console.warn('IndexedDB清空失败:', error);
    }
  }

  // 检查服务可用性
  async checkAvailability(): Promise<{
    localStorage: boolean;
    indexedDB: boolean;
  }> {
    const localStorageAvailable = (await this.localStorage.getStorageInfo()).available;
    
    let indexedDBAvailable = false;
    try {
      const indexedDB = await this.ensureIndexedDB();
      indexedDBAvailable = await indexedDB.isAvailable();
    } catch {
      indexedDBAvailable = false;
    }

    return {
      localStorage: localStorageAvailable,
      indexedDB: indexedDBAvailable,
    };
  }
}

// 导出单例实例
export const localStorageService = new LocalStorageService();
export const storageService = new UnifiedStorageService();