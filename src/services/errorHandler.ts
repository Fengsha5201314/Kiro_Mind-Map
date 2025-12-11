/**
 * 错误处理服务
 * 提供统一的错误处理、重试机制和用户友好的错误消息
 */

import { ApiError } from '../types/api';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_KEY_ERROR = 'API_KEY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  QUOTA_ERROR = 'QUOTA_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

/**
 * 错误处理配置
 */
export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableUserNotification: boolean;
  defaultRetryConfig: RetryConfig;
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  shouldRetry: boolean;
  delay?: number;
  userMessage: string;
  technicalMessage: string;
  errorType: ErrorType;
}

/**
 * 错误处理服务类
 */
export class ErrorHandlerService {
  private config: ErrorHandlerConfig;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      enableLogging: true,
      enableUserNotification: true,
      defaultRetryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        retryableErrors: [
          'NETWORK_ERROR',
          'TIMEOUT_ERROR',
          'RATE_LIMIT_ERROR',
          'SERVER_ERROR'
        ]
      },
      ...config
    };
  }

  /**
   * 处理错误并返回处理结果
   * @param error 错误对象
   * @param attemptCount 当前尝试次数
   * @returns 错误处理结果
   */
  handleError(error: any, attemptCount: number = 1): ErrorHandlingResult {
    const errorInfo = this.analyzeError(error);
    const shouldRetry = this.shouldRetry(errorInfo, attemptCount);
    const delay = shouldRetry ? this.calculateDelay(attemptCount) : undefined;

    const result: ErrorHandlingResult = {
      shouldRetry,
      delay,
      userMessage: this.getUserFriendlyMessage(errorInfo),
      technicalMessage: this.getTechnicalMessage(error),
      errorType: errorInfo.type
    };

    if (this.config.enableLogging) {
      this.logError(error, result, attemptCount);
    }

    return result;
  }

  /**
   * 带重试机制的异步操作执行器
   * @param operation 要执行的操作
   * @param retryConfig 重试配置（可选）
   * @returns 操作结果
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config.defaultRetryConfig, ...retryConfig };
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const errorResult = this.handleError(error, attempt);
        
        // 如果不应该重试或已达到最大重试次数，抛出错误
        if (!errorResult.shouldRetry || attempt > config.maxRetries) {
          throw this.createEnhancedError(error, errorResult);
        }
        
        // 等待后重试
        if (errorResult.delay) {
          await this.delay(errorResult.delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 分析错误类型和详情
   * @param error 错误对象
   * @returns 错误信息
   */
  private analyzeError(error: any): { type: ErrorType; code?: string; message: string } {
    // API错误
    if (error.code) {
      switch (error.code) {
        case 'INVALID_API_KEY':
        case 'API_KEY_EXPIRED':
          return { type: ErrorType.API_KEY_ERROR, code: error.code, message: error.message };
        
        case 'TIMEOUT':
          return { type: ErrorType.TIMEOUT_ERROR, code: error.code, message: error.message };
        
        case 'QUOTA_EXCEEDED':
        case 'RATE_LIMIT_EXCEEDED':
          return { type: ErrorType.QUOTA_ERROR, code: error.code, message: error.message };
        
        case 'INVALID_INPUT':
          return { type: ErrorType.VALIDATION_ERROR, code: error.code, message: error.message };
        
        case 'PARSING_FAILED':
          return { type: ErrorType.PARSING_ERROR, code: error.code, message: error.message };
      }
    }

    // 网络错误
    if (error.name === 'NetworkError' || 
        error.message?.includes('fetch') || 
        error.message?.includes('network')) {
      return { type: ErrorType.NETWORK_ERROR, message: error.message };
    }

    // 超时错误
    if (error.name === 'TimeoutError' || 
        error.message?.includes('timeout')) {
      return { type: ErrorType.TIMEOUT_ERROR, message: error.message };
    }

    // 存储错误
    if (error.name === 'QuotaExceededError' || 
        error.message?.includes('storage')) {
      return { type: ErrorType.STORAGE_ERROR, message: error.message };
    }

    // 默认为未知错误
    return { 
      type: ErrorType.UNKNOWN_ERROR, 
      message: error.message || '未知错误' 
    };
  }

  /**
   * 判断是否应该重试
   * @param errorInfo 错误信息
   * @param attemptCount 尝试次数
   * @returns 是否应该重试
   */
  private shouldRetry(
    errorInfo: { type: ErrorType; code?: string }, 
    attemptCount: number
  ): boolean {
    // 超过最大重试次数
    if (attemptCount > this.config.defaultRetryConfig.maxRetries) {
      return false;
    }

    // 不可重试的错误类型
    const nonRetryableErrors = [
      ErrorType.API_KEY_ERROR,
      ErrorType.VALIDATION_ERROR,
      ErrorType.PARSING_ERROR
    ];

    if (nonRetryableErrors.includes(errorInfo.type)) {
      return false;
    }

    // 可重试的错误类型
    const retryableErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.QUOTA_ERROR,
      ErrorType.UNKNOWN_ERROR
    ];

    return retryableErrors.includes(errorInfo.type);
  }

  /**
   * 计算重试延迟时间
   * @param attemptCount 尝试次数
   * @returns 延迟时间（毫秒）
   */
  private calculateDelay(attemptCount: number): number {
    const { baseDelay, maxDelay, backoffFactor } = this.config.defaultRetryConfig;
    const delay = baseDelay * Math.pow(backoffFactor, attemptCount - 1);
    
    // 添加随机抖动，避免雷群效应
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * 获取用户友好的错误消息
   * @param errorInfo 错误信息
   * @returns 用户友好的错误消息
   */
  private getUserFriendlyMessage(errorInfo: { type: ErrorType; code?: string; message: string }): string {
    switch (errorInfo.type) {
      case ErrorType.API_KEY_ERROR:
        return 'API密钥无效或已过期，请检查您的API密钥配置';
      
      case ErrorType.NETWORK_ERROR:
        return '网络连接失败，请检查您的网络连接后重试';
      
      case ErrorType.TIMEOUT_ERROR:
        return '请求超时，服务器响应较慢，请稍后重试';
      
      case ErrorType.QUOTA_ERROR:
        return 'API调用配额已用完，请稍后重试或升级您的API计划';
      
      case ErrorType.VALIDATION_ERROR:
        return '输入内容格式不正确，请检查后重新提交';
      
      case ErrorType.PARSING_ERROR:
        return 'AI响应解析失败，请重新生成思维导图';
      
      case ErrorType.STORAGE_ERROR:
        return '本地存储空间不足，请清理浏览器数据后重试';
      
      default:
        return '操作失败，请稍后重试。如果问题持续存在，请联系技术支持';
    }
  }

  /**
   * 获取技术错误消息
   * @param error 原始错误对象
   * @returns 技术错误消息
   */
  private getTechnicalMessage(error: any): string {
    if (error.stack) {
      return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return `${error.name || 'Error'}: ${error.message || '未知错误'}`;
  }

  /**
   * 记录错误日志
   * @param error 原始错误
   * @param result 错误处理结果
   * @param attemptCount 尝试次数
   */
  private logError(error: any, result: ErrorHandlingResult, attemptCount: number): void {
    const logData = {
      timestamp: new Date().toISOString(),
      errorType: result.errorType,
      attemptCount,
      shouldRetry: result.shouldRetry,
      userMessage: result.userMessage,
      technicalMessage: result.technicalMessage,
      originalError: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    };

    if (result.errorType === ErrorType.UNKNOWN_ERROR) {
      console.error('未知错误:', logData);
    } else {
      console.warn('处理错误:', logData);
    }
  }

  /**
   * 创建增强的错误对象
   * @param originalError 原始错误
   * @param result 错误处理结果
   * @returns 增强的错误对象
   */
  private createEnhancedError(originalError: any, result: ErrorHandlingResult): ApiError {
    const enhancedError = new Error(result.userMessage) as Error & ApiError;
    enhancedError.code = result.errorType;
    enhancedError.message = result.userMessage;
    enhancedError.details = {
      originalError: originalError.message,
      technicalMessage: result.technicalMessage,
      errorType: result.errorType
    };
    enhancedError.timestamp = Date.now();
    
    return enhancedError;
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

// 导出默认实例
export const errorHandler = new ErrorHandlerService();