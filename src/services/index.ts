/**
 * 服务模块导出
 */

// 存储服务
export { 
  LocalStorageService, 
  UnifiedStorageService,
  StorageServiceError,
  localStorageService,
  storageService 
} from './storageService';

export { 
  IndexedDBService, 
  IndexedDBServiceError,
  indexedDBService 
} from './indexedDBService';

// 文件解析服务
export {
  FileParserServiceImpl,
  FileParseError,
  fileParserService,
  SUPPORTED_FILE_TYPES
} from './fileParserService';

export type {
  FileParserService,
  ParseResult
} from './fileParserService';

// Gemini AI服务
export {
  GeminiServiceImpl,
  geminiService
} from './geminiService';

export type {
  GeminiService,
  ApiError,
  ApiKeyValidation
} from './geminiService';

// 思维导图服务
export {
  MindMapService,
  mindMapService
} from './mindmapService';

// 错误处理服务
export {
  ErrorHandlerService,
  errorHandler,
  ErrorType
} from './errorHandler';

export type {
  ErrorHandlerConfig,
  RetryConfig,
  ErrorHandlingResult
} from './errorHandler';

// 导出服务
export {
  ExportServiceImpl,
  ExportError,
  exportService
} from './exportService';

export type {
  ExportService
} from './exportService';

// 缓存服务
export {
  MemoryCacheService,
  FileCacheService,
  APICacheService,
  memoryCacheService,
  fileCacheService,
  apiCacheService
} from './cacheService';

export type {
  CacheItem,
  CacheConfig,
  CacheStats
} from './cacheService';

// 工具函数
export {
  encryptData,
  decryptData,
  validateEncryptedData,
  generateSecureId,
  calculateHash,
  CryptoError
} from '../utils/crypto';

// 类型定义
export type {
  StorageService,
  StorageInfo,
  StorageError,
  StorageResult,
  MindMapRecord,
  IndexedDBConfig,
  ExportData,
  BackupConfig,
  StorageEvent,
  StorageEventType
} from '../types/storage';

export type {
  MindMapData,
  MindMapNode,
  MindMapStructure,
  NodeStyle,
  ViewState,
  MindMapConfig,
  MindMapOperation,
  MindMapAction,
  ExportFormat
} from '../types/mindmap';