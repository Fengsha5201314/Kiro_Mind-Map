/**
 * 存储相关类型定义
 */

import { MindMapData } from './mindmap';

// 存储服务接口
export interface StorageService {
  /**
   * 保存API密钥（加密存储）
   * @param key API密钥
   */
  saveApiKey(key: string): Promise<void>;
  
  /**
   * 获取API密钥（解密）
   * @returns API密钥或null
   */
  getApiKey(): Promise<string | null>;
  
  /**
   * 删除API密钥
   */
  deleteApiKey(): Promise<void>;
  
  /**
   * 保存思维导图数据
   * @param data 思维导图数据
   */
  saveMindMap(data: MindMapData): Promise<void>;
  
  /**
   * 获取指定思维导图
   * @param id 思维导图ID
   * @returns 思维导图数据或null
   */
  getMindMap(id: string): Promise<MindMapData | null>;
  
  /**
   * 获取所有思维导图列表
   * @returns 思维导图数据数组
   */
  getAllMindMaps(): Promise<MindMapData[]>;
  
  /**
   * 删除指定思维导图
   * @param id 思维导图ID
   */
  deleteMindMap(id: string): Promise<void>;
  
  /**
   * 清空所有数据
   */
  clearAll(): Promise<void>;
  
  /**
   * 获取存储使用情况
   * @returns 存储统计信息
   */
  getStorageInfo(): Promise<StorageInfo>;
}

// 存储统计信息
export interface StorageInfo {
  totalSize: number;             // 总使用大小（字节）
  availableSize: number;         // 可用大小（字节）
  mindMapCount: number;          // 思维导图数量
  oldestMindMap?: {              // 最旧的思维导图
    id: string;
    title: string;
    createdAt: number;
  };
}

// 本地存储键名常量
export const STORAGE_KEYS = {
  API_KEY: 'mindmap_api_key_encrypted',
  SETTINGS: 'mindmap_settings',
  CURRENT_MAP: 'mindmap_current',
  USER_PREFERENCES: 'mindmap_user_preferences',
} as const;

// IndexedDB数据库配置
export interface IndexedDBConfig {
  dbName: string;                // 数据库名称
  version: number;               // 数据库版本
  stores: {                      // 对象存储配置
    mindmaps: {
      keyPath: string;
      indexes: Array<{
        name: string;
        keyPath: string;
        unique: boolean;
      }>;
    };
  };
}

// IndexedDB思维导图记录
export interface MindMapRecord {
  id: string;                    // 主键
  data: MindMapData;             // 思维导图数据
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
  size: number;                  // 数据大小（字节）
  tags?: string[];               // 标签
}

// 存储错误类型
export interface StorageError {
  type: 'quota_exceeded' | 'access_denied' | 'corruption' | 'network' | 'unknown';
  message: string;
  details?: any;
}

// 存储操作结果
export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

// 数据导入导出格式
export interface ExportData {
  version: string;               // 导出格式版本
  timestamp: number;             // 导出时间戳
  mindmaps: MindMapData[];       // 思维导图数据
  settings?: any;                // 设置数据
}

// 数据备份配置
export interface BackupConfig {
  autoBackup: boolean;           // 是否自动备份
  backupInterval: number;        // 备份间隔（毫秒）
  maxBackups: number;            // 最大备份数量
  compressionEnabled: boolean;   // 是否启用压缩
}

// 缓存配置
export interface CacheConfig {
  maxSize: number;               // 最大缓存大小（字节）
  ttl: number;                   // 缓存生存时间（毫秒）
  strategy: 'lru' | 'fifo' | 'lfu'; // 缓存策略
}

// 存储事件类型
export type StorageEventType = 
  | 'save'
  | 'load' 
  | 'delete'
  | 'clear'
  | 'quota_warning'
  | 'error';

// 存储事件
export interface StorageEvent {
  type: StorageEventType;
  timestamp: number;
  details?: any;
}