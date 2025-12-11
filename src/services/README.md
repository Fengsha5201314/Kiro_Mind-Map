# 存储服务文档

## 概述

存储服务提供了完整的本地数据存储解决方案，包括API密钥的安全存储、应用设置管理和思维导图数据的持久化。

## 核心组件

### 1. 加密工具 (`crypto.ts`)

提供数据加密/解密功能，确保敏感信息（如API密钥）的安全存储。

**主要功能：**
- `encryptData(plaintext: string)`: 加密文本数据
- `decryptData(encryptedData: string)`: 解密文本数据
- `validateEncryptedData(encryptedData: string)`: 验证加密数据完整性
- `generateSecureId(length?: number)`: 生成安全随机ID
- `calculateHash(data: string)`: 计算数据哈希值

**安全特性：**
- 使用AES-GCM算法进行加密
- PBKDF2密钥派生，100,000次迭代
- 随机盐值和初始化向量
- 基于浏览器指纹的固定密码生成

### 2. LocalStorage服务 (`storageService.ts`)

管理LocalStorage中的数据，主要用于API密钥和设置存储。

**主要功能：**
- API密钥的加密存储和读取
- 应用设置的JSON序列化存储
- 存储空间使用情况监控
- 数据完整性验证

**使用示例：**
```typescript
import { localStorageService } from './services';

// API密钥管理
await localStorageService.saveApiKey('your-api-key');
const apiKey = await localStorageService.getApiKey();
const mask = await localStorageService.getApiKeyMask(); // "sk-1***cdef"

// 设置管理
await localStorageService.saveSettings({ theme: 'dark' });
const settings = await localStorageService.getSettings();
```

### 3. IndexedDB服务 (`indexedDBService.ts`)

管理IndexedDB中的思维导图数据，支持大容量存储和复杂查询。

**主要功能：**
- 思维导图的CRUD操作
- 分页查询和搜索
- 批量操作和数据导入导出
- 存储统计和空间管理

**数据库结构：**
```
MindMapDB (v1)
├── mindmaps (ObjectStore)
    ├── id (KeyPath)
    ├── createdAt (Index)
    ├── updatedAt (Index)
    └── title (Index)
```

**使用示例：**
```typescript
import { indexedDBService } from './services';

// 保存思维导图
await indexedDBService.saveMindMap(mindMapData);

// 获取思维导图
const mindMap = await indexedDBService.getMindMap('mindmap-id');

// 搜索思维导图
const results = await indexedDBService.searchMindMaps('关键词');

// 分页查询
const { data, total, hasMore } = await indexedDBService.getMindMapsPaginated(0, 20);
```

### 4. 统一存储服务 (`UnifiedStorageService`)

整合LocalStorage和IndexedDB功能，提供统一的存储接口。

**使用示例：**
```typescript
import { storageService } from './services';

// API密钥（LocalStorage）
await storageService.saveApiKey('api-key');

// 思维导图（IndexedDB）
await storageService.saveMindMap(mindMapData);

// 综合信息
const info = await storageService.getStorageInfo();
const availability = await storageService.checkAvailability();
```

## 错误处理

所有存储操作都包含完善的错误处理机制：

### 错误类型

1. **CryptoError**: 加密/解密相关错误
2. **StorageServiceError**: LocalStorage操作错误
3. **IndexedDBServiceError**: IndexedDB操作错误

### 常见错误场景

- 存储空间不足 (`QUOTA_EXCEEDED`)
- 访问被拒绝 (`ACCESS_DENIED`)
- 数据损坏 (`CORRUPTED_DATA`)
- 数据库连接失败 (`DATABASE_CONNECTION_FAILED`)

### 错误处理示例

```typescript
try {
  await storageService.saveApiKey(apiKey);
} catch (error) {
  if (error instanceof StorageServiceError) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        // 处理存储空间不足
        break;
      case 'INVALID_API_KEY':
        // 处理无效API密钥
        break;
      default:
        // 处理其他错误
        break;
    }
  }
}
```

## 性能优化

### LocalStorage优化
- 数据压缩和批量操作
- 存储空间监控和清理
- 错误恢复机制

### IndexedDB优化
- 事务管理和连接池
- 索引优化和查询性能
- 分页加载和虚拟滚动支持

## 数据迁移

系统支持数据的导入导出，便于版本升级和数据迁移：

```typescript
// 导出所有数据
const exportData = await indexedDBService.exportAllData();

// 导入数据
const result = await indexedDBService.importData(exportData);
console.log(`导入成功: ${result.imported}, 跳过: ${result.skipped}`);
```

## 测试

存储服务包含完整的单元测试：

```bash
# 运行存储服务测试
npm test src/test/storage.test.ts

# 运行IndexedDB测试
npm test src/test/indexedDB.test.ts
```

测试覆盖：
- 加密/解密功能
- API密钥管理
- 设置存储
- 思维导图CRUD操作
- 错误处理场景

## 最佳实践

1. **安全性**
   - 始终加密敏感数据
   - 定期验证数据完整性
   - 实施访问控制

2. **性能**
   - 使用分页查询大量数据
   - 实施数据缓存策略
   - 监控存储使用情况

3. **可靠性**
   - 实施错误重试机制
   - 定期备份重要数据
   - 优雅处理存储限制

4. **维护性**
   - 使用类型安全的接口
   - 记录详细的操作日志
   - 实施版本兼容性检查

## 配置选项

### 存储键配置
```typescript
export const STORAGE_KEYS = {
  API_KEY: 'mindmap_api_key_encrypted',
  SETTINGS: 'mindmap_settings',
  CURRENT_MAP: 'mindmap_current',
  USER_PREFERENCES: 'mindmap_user_preferences',
} as const;
```

### 加密配置
```typescript
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  saltLength: 16,
  iterations: 100000,
} as const;
```

### IndexedDB配置
```typescript
const DB_CONFIG = {
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
```