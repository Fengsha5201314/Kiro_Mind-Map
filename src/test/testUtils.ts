// 测试工具函数
import * as fc from 'fast-check';
import { MindMapNode, MindMapData } from '@/types/mindmap';

/**
 * 生成随机的思维导图节点
 */
export const arbitraryMindMapNode = (): fc.Arbitrary<MindMapNode> => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    content: fc.string({ minLength: 1, maxLength: 100 }),
    level: fc.integer({ min: 0, max: 5 }),
    parentId: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 })),
    children: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
    position: fc.option(fc.record({
      x: fc.integer({ min: -1000, max: 1000 }),
      y: fc.integer({ min: -1000, max: 1000 })
    })),
    collapsed: fc.option(fc.boolean())
  });
};

/**
 * 生成随机的思维导图数据（确保有效的树结构）
 */
export const arbitraryMindMapData = (): fc.Arbitrary<MindMapData> => {
  return fc.integer({ min: 1, max: 10 }).chain(nodeCount => {
    const rootId = 'root';
    const nodeIds = [rootId, ...Array.from({ length: nodeCount - 1 }, (_, i) => `node_${i + 1}`)];
    
    return fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      nodes: fc.constant(nodeIds.map((id, index) => ({
        id,
        content: `节点内容 ${index}`,
        level: index === 0 ? 0 : Math.floor(Math.random() * 3) + 1,
        parentId: index === 0 ? null : nodeIds[Math.floor(Math.random() * index)], // 确保父节点存在
        children: [] as string[],
        position: { x: Math.random() * 1000, y: Math.random() * 1000 },
        collapsed: Math.random() > 0.5
      }))),
      createdAt: fc.integer({ min: 0, max: Date.now() }),
      updatedAt: fc.integer({ min: 0, max: Date.now() }),
      metadata: fc.option(fc.record({
        sourceType: fc.option(fc.constantFrom('text', 'pdf', 'word', 'markdown')),
        sourceFileName: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
      }))
    });
  });
};

/**
 * 生成有效的API密钥字符串
 */
export const arbitraryApiKey = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length > 0);
};

/**
 * 生成有效的文本内容
 */
export const arbitraryTextContent = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0);
};

/**
 * 生成有效的主题字符串
 */
export const arbitraryTopic = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
};

/**
 * 生成日期时间戳
 */
export const arbitraryTimestamp = (): fc.Arbitrary<number> => {
  return fc.integer({ min: 0, max: Date.now() });
};

/**
 * 生成空白字符串（用于测试输入验证）
 */
export const arbitraryWhitespaceString = (): fc.Arbitrary<string> => {
  return fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'));
};

/**
 * 创建属性测试的配置
 */
export const propertyTestConfig = {
  numRuns: 100, // 每个属性测试运行100次
  verbose: true,
  seed: 42 // 固定种子以确保可重现性
};

/**
 * 模拟LocalStorage
 */
export const createMockLocalStorage = () => {
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
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
};

/**
 * 模拟IndexedDB
 */
export const createMockIndexedDB = () => {
  const databases: Record<string, Record<string, any>> = {};
  
  return {
    open: (name: string, version?: number) => {
      if (!databases[name]) {
        databases[name] = {};
      }
      
      return Promise.resolve({
        result: {
          name,
          version: version || 1,
          objectStoreNames: ['mindmaps'],
          transaction: (storeNames: string[], mode: string = 'readonly') => ({
            objectStore: (storeName: string) => ({
              add: (data: any, key?: string) => {
                const id = key || data.id || Math.random().toString();
                databases[name][id] = data;
                return Promise.resolve(id);
              },
              get: (key: string) => {
                const result = databases[name][key];
                return Promise.resolve(result);
              },
              getAll: () => {
                const results = Object.values(databases[name]);
                return Promise.resolve(results);
              },
              delete: (key: string) => {
                delete databases[name][key];
                return Promise.resolve();
              },
              put: (data: any, key?: string) => {
                const id = key || data.id || Math.random().toString();
                databases[name][id] = data;
                return Promise.resolve(id);
              }
            })
          })
        }
      });
    },
    deleteDatabase: (name: string) => {
      delete databases[name];
      return Promise.resolve();
    }
  };
};

/**
 * 等待异步操作完成的工具函数
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 深度比较两个对象是否相等
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
};