/**
 * 通用类型定义和类型导出
 */

// 导出所有类型模块
export * from './mindmap';
export * from './api';
export * from './storage';

// 通用工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 文件类型枚举
export enum FileType {
  PDF = 'pdf',
  WORD = 'word',
  MARKDOWN = 'markdown',
  TEXT = 'text',
  UNKNOWN = 'unknown'
}

// 支持的文件扩展名
export const SUPPORTED_FILE_EXTENSIONS = {
  [FileType.PDF]: ['.pdf'],
  [FileType.WORD]: ['.doc', '.docx'],
  [FileType.MARKDOWN]: ['.md', '.markdown'],
  [FileType.TEXT]: ['.txt'],
} as const;

// 应用主题
export type Theme = 'light' | 'dark' | 'auto';

// 语言设置
export type Language = 'zh-CN' | 'en-US';

// 应用设置
export interface AppSettings {
  theme: Theme;
  language: Language;
  autoSave: boolean;
  autoSaveInterval: number;      // 自动保存间隔（毫秒）
  maxFileSize: number;           // 最大文件大小（字节）
  enableAnimations: boolean;     // 是否启用动画
  showTutorial: boolean;         // 是否显示教程
}

// 用户偏好设置
export interface UserPreferences {
  defaultExportFormat: 'png' | 'json' | 'markdown';
  defaultNodeStyle: {
    backgroundColor: string;
    textColor: string;
    fontSize: number;
  };
  canvasSettings: {
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
  };
  shortcuts: Record<string, string>; // 快捷键映射
}

// 应用状态
export type AppStatus = 'initializing' | 'ready' | 'loading' | 'error';

// 错误级别
export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

// 通用错误接口
export interface AppError {
  id: string;
  level: ErrorLevel;
  message: string;
  details?: any;
  timestamp: number;
  stack?: string;
}

// 通知类型
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

// 通知消息
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;             // 显示时长（毫秒），0表示不自动关闭
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// 加载状态
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;             // 进度百分比 0-100
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 搜索参数
export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 操作结果
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: AppError;
}

// 事件处理器类型
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

// 异步操作状态
export interface AsyncState<T = any> {
  data?: T;
  loading: boolean;
  error?: AppError;
  lastUpdated?: number;
}

// 键值对类型
export type KeyValuePair<T = any> = {
  key: string;
  value: T;
};

// 坐标点
export interface Point {
  x: number;
  y: number;
}

// 尺寸
export interface Size {
  width: number;
  height: number;
}

// 矩形区域
export interface Rectangle extends Point, Size {}

// 颜色值（支持多种格式）
export type Color = string; // hex, rgb, rgba, hsl, hsla, named colors

// 时间戳（毫秒）
export type Timestamp = number;

// ID类型
export type ID = string;

// 版本号
export type Version = string;