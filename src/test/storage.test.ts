/**
 * 存储服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageService } from '../services/storageService';
import { encryptData, decryptData } from '../utils/crypto';

// 模拟LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// 设置全局localStorage模拟
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('加密工具测试', () => {
  it('应该能够加密和解密数据', async () => {
    const originalText = 'test-api-key-12345';
    
    const encrypted = await encryptData(originalText);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalText);
    
    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('应该为相同输入生成不同的加密结果', async () => {
    const text = 'same-input';
    
    const encrypted1 = await encryptData(text);
    const encrypted2 = await encryptData(text);
    
    // 由于使用随机IV，每次加密结果应该不同
    expect(encrypted1).not.toBe(encrypted2);
    
    // 但解密结果应该相同
    const decrypted1 = await decryptData(encrypted1);
    const decrypted2 = await decryptData(encrypted2);
    
    expect(decrypted1).toBe(text);
    expect(decrypted2).toBe(text);
  });
});

describe('LocalStorage服务测试', () => {
  let storageService: LocalStorageService;

  beforeEach(() => {
    localStorageMock.clear();
    storageService = new LocalStorageService();
  });

  describe('API密钥管理', () => {
    it('应该能够保存和读取API密钥', async () => {
      const apiKey = 'test-api-key-123456789';
      
      await storageService.saveApiKey(apiKey);
      const retrievedKey = await storageService.getApiKey();
      
      expect(retrievedKey).toBe(apiKey);
    });

    it('应该能够检查API密钥是否存在', async () => {
      expect(await storageService.hasApiKey()).toBe(false);
      
      await storageService.saveApiKey('test-key');
      expect(await storageService.hasApiKey()).toBe(true);
    });

    it('应该能够删除API密钥', async () => {
      await storageService.saveApiKey('test-key');
      expect(await storageService.hasApiKey()).toBe(true);
      
      await storageService.deleteApiKey();
      expect(await storageService.hasApiKey()).toBe(false);
      expect(await storageService.getApiKey()).toBe(null);
    });

    it('应该返回正确的API密钥掩码', async () => {
      const apiKey = 'sk-1234567890abcdef';
      await storageService.saveApiKey(apiKey);
      
      const mask = await storageService.getApiKeyMask();
      expect(mask).toBe('sk-1***cdef');
    });

    it('应该拒绝空的API密钥', async () => {
      await expect(storageService.saveApiKey('')).rejects.toThrow();
      await expect(storageService.saveApiKey('   ')).rejects.toThrow();
    });
  });

  describe('设置管理', () => {
    it('应该能够保存和读取设置', async () => {
      const settings = {
        theme: 'dark',
        language: 'zh-CN',
        autoSave: true,
      };
      
      await storageService.saveSettings(settings);
      const retrievedSettings = await storageService.getSettings();
      
      expect(retrievedSettings).toEqual(settings);
    });

    it('应该返回空对象当没有设置时', async () => {
      const settings = await storageService.getSettings();
      expect(settings).toEqual({});
    });

    it('应该能够删除设置', async () => {
      await storageService.saveSettings({ test: 'value' });
      await storageService.deleteSettings();
      
      const settings = await storageService.getSettings();
      expect(settings).toEqual({});
    });
  });

  describe('存储信息', () => {
    it('应该能够获取存储使用情况', async () => {
      const info = await storageService.getStorageInfo();
      
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('usage');
      expect(info).toHaveProperty('keys');
      expect(typeof info.available).toBe('boolean');
    });
  });
});