/**
 * IndexedDB存储服务
 * 用于存储思维导图数据和历史记录
 */

import { 
  MindMapRecord, 
  IndexedDBConfig, 
  StorageInfo
} from '../types/storage';
import { MindMapData } from '../types/mindmap';

// IndexedDB配置
const DB_CONFIG: IndexedDBConfig = {
  dbName: 'MindMapDB',
  version: 1,
  stores: {
    mindmaps: {
      keyPath: 'id',
      indexes: [
        { name: 'createdAt', keyPath: 'createdAt', unique: false },
        { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
        { name: 'title', keyPath: 'data.title', unique: false },
      ],
    },
  },
};

// IndexedDB服务错误类
export class IndexedDBServiceError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'IndexedDBServiceError';
  }
}

/**
 * IndexedDB存储服务类
 */
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库连接
   */
  private async initDatabase(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new IndexedDBServiceError('浏览器不支持IndexedDB', 'INDEXEDDB_UNSUPPORTED'));
        return;
      }

      const request = indexedDB.open(DB_CONFIG.dbName, DB_CONFIG.version);

      request.onerror = () => {
        reject(new IndexedDBServiceError(
          'IndexedDB打开失败',
          'DATABASE_OPEN_FAILED',
          request.error
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // 监听数据库意外关闭
        this.db.onclose = () => {
          this.db = null;
          this.initPromise = null;
        };

        // 监听版本变更
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          // 创建思维导图存储
          if (!db.objectStoreNames.contains('mindmaps')) {
            const mindmapStore = db.createObjectStore('mindmaps', {
              keyPath: DB_CONFIG.stores.mindmaps.keyPath,
            });

            // 创建索引
            DB_CONFIG.stores.mindmaps.indexes.forEach(index => {
              mindmapStore.createIndex(index.name, index.keyPath, {
                unique: index.unique,
              });
            });
          }
        } catch (error) {
          reject(new IndexedDBServiceError(
            '数据库结构创建失败',
            'DATABASE_UPGRADE_FAILED',
            error
          ));
        }
      };

      request.onblocked = () => {
        reject(new IndexedDBServiceError(
          '数据库被阻塞，请关闭其他标签页',
          'DATABASE_BLOCKED'
        ));
      };
    });

    return this.initPromise;
  }

  /**
   * 获取数据库连接
   */
  private async getDatabase(): Promise<IDBDatabase> {
    await this.initDatabase();
    if (!this.db) {
      throw new IndexedDBServiceError('数据库连接失败', 'DATABASE_CONNECTION_FAILED');
    }
    return this.db;
  }

  /**
   * 执行事务操作
   */
  private async executeTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.getDatabase();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new IndexedDBServiceError(
            '事务操作失败',
            'TRANSACTION_FAILED',
            request.error
          ));
        };

        transaction.onerror = () => {
          reject(new IndexedDBServiceError(
            '事务失败',
            'TRANSACTION_FAILED',
            transaction.error
          ));
        };

        transaction.onabort = () => {
          reject(new IndexedDBServiceError(
            '事务被中止',
            'TRANSACTION_ABORTED',
            transaction.error
          ));
        };
      } catch (error) {
        reject(new IndexedDBServiceError(
          '事务创建失败',
          'TRANSACTION_CREATE_FAILED',
          error
        ));
      }
    });
  }

  /**
   * 计算数据大小（字节）
   */
  private calculateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * 保存思维导图数据
   */
  async saveMindMap(data: MindMapData): Promise<void> {
    try {
      const now = Date.now();
      const record: MindMapRecord = {
        id: data.id,
        data: {
          ...data,
          updatedAt: now,
        },
        createdAt: data.createdAt || now,
        updatedAt: now,
        size: this.calculateDataSize(data),
      };

      await this.executeTransaction('mindmaps', 'readwrite', (store) => {
        return store.put(record);
      });
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('思维导图保存失败', 'SAVE_FAILED', error);
    }
  }

  /**
   * 获取指定思维导图
   */
  async getMindMap(id: string): Promise<MindMapData | null> {
    try {
      const record = await this.executeTransaction('mindmaps', 'readonly', (store) => {
        return store.get(id);
      });

      return record ? record.data : null;
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('思维导图读取失败', 'READ_FAILED', error);
    }
  }

  /**
   * 获取所有思维导图列表
   */
  async getAllMindMaps(): Promise<MindMapData[]> {
    try {
      const records = await this.executeTransaction('mindmaps', 'readonly', (store) => {
        return store.getAll();
      });

      // 按更新时间倒序排列
      return records
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(record => record.data);
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('思维导图列表读取失败', 'READ_ALL_FAILED', error);
    }
  }

  /**
   * 获取思维导图列表（分页）
   */
  async getMindMapsPaginated(
    offset: number = 0,
    limit: number = 20
  ): Promise<{ data: MindMapData[]; total: number; hasMore: boolean }> {
    try {
      const db = await this.getDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['mindmaps'], 'readonly');
        const store = transaction.objectStore('mindmaps');
        const index = store.index('updatedAt');
        
        // 获取总数
        const countRequest = store.count();
        
        // 获取分页数据（按更新时间倒序）
        const dataRequest = index.openCursor(null, 'prev');
        
        let total = 0;
        const results: MindMapData[] = [];
        let currentOffset = 0;
        let collected = 0;

        countRequest.onsuccess = () => {
          total = countRequest.result;
        };

        dataRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (!cursor) {
            // 遍历完成
            resolve({
              data: results,
              total,
              hasMore: offset + limit < total,
            });
            return;
          }

          if (currentOffset >= offset && collected < limit) {
            const record = cursor.value as MindMapRecord;
            results.push(record.data);
            collected++;
          }

          currentOffset++;
          
          if (collected < limit) {
            cursor.continue();
          } else {
            resolve({
              data: results,
              total,
              hasMore: offset + limit < total,
            });
          }
        };

        dataRequest.onerror = () => {
          reject(new IndexedDBServiceError(
            '分页查询失败',
            'PAGINATED_READ_FAILED',
            dataRequest.error
          ));
        };

        countRequest.onerror = () => {
          reject(new IndexedDBServiceError(
            '计数查询失败',
            'COUNT_FAILED',
            countRequest.error
          ));
        };
      });
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('分页查询失败', 'PAGINATED_READ_FAILED', error);
    }
  }

  /**
   * 搜索思维导图
   */
  async searchMindMaps(query: string): Promise<MindMapData[]> {
    try {
      const allMindMaps = await this.getAllMindMaps();
      const lowerQuery = query.toLowerCase();

      return allMindMaps.filter(mindmap => {
        // 搜索标题
        if (mindmap.title.toLowerCase().includes(lowerQuery)) {
          return true;
        }

        // 搜索节点内容
        return mindmap.nodes.some((node: any) => 
          node.content.toLowerCase().includes(lowerQuery)
        );
      });
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('搜索失败', 'SEARCH_FAILED', error);
    }
  }

  /**
   * 删除指定思维导图
   */
  async deleteMindMap(id: string): Promise<void> {
    try {
      await this.executeTransaction('mindmaps', 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('思维导图删除失败', 'DELETE_FAILED', error);
    }
  }

  /**
   * 批量删除思维导图
   */
  async deleteMindMaps(ids: string[]): Promise<void> {
    try {
      const db = await this.getDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['mindmaps'], 'readwrite');
        const store = transaction.objectStore('mindmaps');
        
        let completed = 0;
        const total = ids.length;

        if (total === 0) {
          resolve();
          return;
        }

        const handleComplete = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        ids.forEach(id => {
          const request = store.delete(id);
          request.onsuccess = handleComplete;
          request.onerror = () => {
            reject(new IndexedDBServiceError(
              `删除思维导图 ${id} 失败`,
              'BATCH_DELETE_FAILED',
              request.error
            ));
          };
        });

        transaction.onerror = () => {
          reject(new IndexedDBServiceError(
            '批量删除事务失败',
            'BATCH_DELETE_TRANSACTION_FAILED',
            transaction.error
          ));
        };
      });
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('批量删除失败', 'BATCH_DELETE_FAILED', error);
    }
  }

  /**
   * 清空所有思维导图数据
   */
  async clearAll(): Promise<void> {
    try {
      await this.executeTransaction('mindmaps', 'readwrite', (store) => {
        return store.clear();
      });
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('清空数据失败', 'CLEAR_FAILED', error);
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const records = await this.executeTransaction('mindmaps', 'readonly', (store) => {
        return store.getAll();
      });

      let totalSize = 0;
      let oldestMindMap: StorageInfo['oldestMindMap'];

      records.forEach(record => {
        totalSize += record.size;
        
        if (!oldestMindMap || record.createdAt < oldestMindMap.createdAt) {
          oldestMindMap = {
            id: record.id,
            title: record.data.title,
            createdAt: record.createdAt,
          };
        }
      });

      // 估算可用空间（IndexedDB通常限制更大，但这里保守估计）
      const estimatedQuota = 50 * 1024 * 1024; // 50MB
      
      return {
        totalSize,
        availableSize: Math.max(0, estimatedQuota - totalSize),
        mindMapCount: records.length,
        oldestMindMap,
      };
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('获取存储信息失败', 'STORAGE_INFO_FAILED', error);
    }
  }

  /**
   * 导出所有数据
   */
  async exportAllData(): Promise<{
    mindmaps: MindMapData[];
    exportTime: number;
    version: string;
  }> {
    try {
      const mindmaps = await this.getAllMindMaps();
      
      return {
        mindmaps,
        exportTime: Date.now(),
        version: '1.0',
      };
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('数据导出失败', 'EXPORT_FAILED', error);
    }
  }

  /**
   * 导入数据
   */
  async importData(data: {
    mindmaps: MindMapData[];
    version?: string;
  }): Promise<{ imported: number; skipped: number; errors: string[] }> {
    try {
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const mindmap of data.mindmaps) {
        try {
          // 检查是否已存在
          const existing = await this.getMindMap(mindmap.id);
          if (existing) {
            results.skipped++;
            continue;
          }

          // 导入数据
          await this.saveMindMap(mindmap);
          results.imported++;
        } catch (error) {
          results.errors.push(`导入思维导图 ${mindmap.title} 失败: ${error}`);
        }
      }

      return results;
    } catch (error) {
      if (error instanceof IndexedDBServiceError) {
        throw error;
      }
      throw new IndexedDBServiceError('数据导入失败', 'IMPORT_FAILED', error);
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * 检查数据库是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initDatabase();
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例实例
export const indexedDBService = new IndexedDBService();