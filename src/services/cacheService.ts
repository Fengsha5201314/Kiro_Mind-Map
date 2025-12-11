/**
 * 缓存服务
 * 实现文件内容缓存和API响应缓存，提升应用性能
 */

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  size: number; // 数据大小（字节）
  accessCount: number;
  lastAccessed: number;
}

// 缓存配置
export interface CacheConfig {
  // 最大缓存大小（字节）
  maxSize: number;
  // 默认过期时间（毫秒）
  defaultTTL: number;
  // 最大缓存项数量
  maxItems: number;
  // 清理策略
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  // 是否启用压缩
  enableCompression: boolean;
  // 压缩阈值（字节）
  compressionThreshold: number;
}

// 缓存统计
export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  lastCleanup: number;
}

// 默认配置
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxItems: 1000,
  evictionPolicy: 'LRU',
  enableCompression: false,
  compressionThreshold: 1024 // 1KB
};

/**
 * 内存缓存服务类
 */
export class MemoryCacheService {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig;
  private stats: CacheStats = {
    totalItems: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    evictionCount: 0,
    lastCleanup: Date.now()
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 计算数据大小（粗略估算）
   */
  private calculateSize(data: any): number {
    if (typeof data === 'string') {
      return data.length * 2; // Unicode字符占2字节
    }
    if (typeof data === 'object') {
      return JSON.stringify(data).length * 2;
    }
    return 8; // 其他类型默认8字节
  }

  /**
   * 压缩数据（简单的JSON字符串压缩）
   */
  private compress(data: any): string {
    if (!this.config.enableCompression) {
      return JSON.stringify(data);
    }
    
    const jsonString = JSON.stringify(data);
    if (jsonString.length < this.config.compressionThreshold) {
      return jsonString;
    }
    
    // 简单的压缩：移除空白字符
    return jsonString.replace(/\s+/g, '');
  }

  /**
   * 解压缩数据
   */
  private decompress(compressedData: string): any {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.error('缓存数据解压缩失败:', error);
      return null;
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiresAt;
  }

  /**
   * 执行缓存清理策略
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    const items = Array.from(this.cache.entries());
    let itemToRemove: [string, CacheItem] | null = null;

    switch (this.config.evictionPolicy) {
      case 'LRU': // 最近最少使用
        itemToRemove = items.reduce((oldest, current) => 
          current[1].lastAccessed < oldest[1].lastAccessed ? current : oldest
        );
        break;
        
      case 'LFU': // 最少使用频率
        itemToRemove = items.reduce((leastUsed, current) => 
          current[1].accessCount < leastUsed[1].accessCount ? current : leastUsed
        );
        break;
        
      case 'FIFO': // 先进先出
        itemToRemove = items.reduce((oldest, current) => 
          current[1].timestamp < oldest[1].timestamp ? current : oldest
        );
        break;
    }

    if (itemToRemove) {
      this.cache.delete(itemToRemove[0]);
      this.stats.totalSize -= itemToRemove[1].size;
      this.stats.totalItems--;
      this.stats.evictionCount++;
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const item = this.cache.get(key);
      if (item) {
        this.cache.delete(key);
        this.stats.totalSize -= item.size;
        this.stats.totalItems--;
      }
    }

    this.stats.lastCleanup = now;
    
    if (expiredKeys.length > 0) {
      console.log(`缓存清理: 移除了 ${expiredKeys.length} 个过期项`);
    }
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);
    const compressedValue = this.compress(value);
    const size = this.calculateSize(compressedValue);

    // 检查是否需要清理空间
    while (
      (this.stats.totalSize + size > this.config.maxSize || 
       this.cache.size >= this.config.maxItems) &&
      this.cache.size > 0
    ) {
      this.evict();
    }

    // 如果键已存在，更新统计信息
    const existingItem = this.cache.get(key);
    if (existingItem) {
      this.stats.totalSize -= existingItem.size;
    } else {
      this.stats.totalItems++;
    }

    const cacheItem: CacheItem<string> = {
      key,
      value: compressedValue,
      timestamp: now,
      expiresAt,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, cacheItem);
    this.stats.totalSize += size;
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.missCount++;
      this.updateHitRate();
      return null;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.stats.totalSize -= item.size;
      this.stats.totalItems--;
      this.stats.missCount++;
      this.updateHitRate();
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hitCount++;
    this.updateHitRate();

    return this.decompress(item.value);
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && !this.isExpired(item);
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.stats.totalSize -= item.size;
      this.stats.totalItems--;
      return true;
    }
    return false;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalItems = 0;
    this.stats.totalSize = 0;
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * 文件内容缓存服务
 */
export class FileCacheService extends MemoryCacheService {
  constructor() {
    super({
      maxSize: 20 * 1024 * 1024, // 20MB
      defaultTTL: 10 * 60 * 1000, // 10分钟
      maxItems: 100,
      evictionPolicy: 'LRU',
      enableCompression: true,
      compressionThreshold: 1024
    });
  }

  /**
   * 生成文件缓存键
   */
  private generateFileKey(file: File): string {
    return `file_${file.name}_${file.size}_${file.lastModified}`;
  }

  /**
   * 缓存文件内容
   */
  cacheFileContent(file: File, content: string): void {
    const key = this.generateFileKey(file);
    this.set(key, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      content
    }, 15 * 60 * 1000); // 15分钟过期
  }

  /**
   * 获取文件内容缓存
   */
  getFileContent(file: File): string | null {
    const key = this.generateFileKey(file);
    const cached = this.get<{
      fileName: string;
      fileSize: number;
      fileType: string;
      lastModified: number;
      content: string;
    }>(key);
    
    return cached ? cached.content : null;
  }

  /**
   * 检查文件是否已缓存
   */
  isFileCached(file: File): boolean {
    const key = this.generateFileKey(file);
    return this.has(key);
  }
}

/**
 * API响应缓存服务
 */
export class APICacheService extends MemoryCacheService {
  constructor() {
    super({
      maxSize: 10 * 1024 * 1024, // 10MB
      defaultTTL: 5 * 60 * 1000, // 5分钟
      maxItems: 200,
      evictionPolicy: 'LRU',
      enableCompression: true,
      compressionThreshold: 512
    });
  }

  /**
   * 生成API缓存键
   * 使用TextEncoder处理Unicode字符，避免btoa的InvalidCharacterError
   */
  private generateAPIKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    
    // 使用TextEncoder处理可能包含中文的字符串
    const encoder = new TextEncoder();
    const data = encoder.encode(paramString);
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    
    return `api_${endpoint}_${btoa(binary)}`;
  }

  /**
   * 缓存API响应
   */
  cacheAPIResponse(endpoint: string, params: any, response: any, ttl?: number): void {
    const key = this.generateAPIKey(endpoint, params);
    this.set(key, {
      endpoint,
      params,
      response,
      cachedAt: Date.now()
    }, ttl);
  }

  /**
   * 获取API响应缓存
   */
  getAPIResponse<T>(endpoint: string, params?: any): T | null {
    const key = this.generateAPIKey(endpoint, params);
    const cached = this.get<{
      endpoint: string;
      params: any;
      response: T;
      cachedAt: number;
    }>(key);
    
    return cached ? cached.response : null;
  }

  /**
   * 检查API响应是否已缓存
   */
  isAPICached(endpoint: string, params?: any): boolean {
    const key = this.generateAPIKey(endpoint, params);
    return this.has(key);
  }

  /**
   * 清除特定端点的缓存
   */
  clearEndpointCache(endpoint: string): void {
    const keysToDelete = this.keys().filter(key => key.includes(`api_${endpoint}_`));
    keysToDelete.forEach(key => this.delete(key));
  }
}

// 导出单例实例
export const memoryCacheService = new MemoryCacheService();
export const fileCacheService = new FileCacheService();
export const apiCacheService = new APICacheService();

export default {
  MemoryCacheService,
  FileCacheService,
  APICacheService,
  memoryCacheService,
  fileCacheService,
  apiCacheService
};