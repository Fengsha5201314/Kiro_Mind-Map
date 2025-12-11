import { useCallback, useState } from 'react';
import { errorHandler, ErrorType } from '../services/errorHandler';

/**
 * Toast消息接口
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  autoClose?: boolean;
}

/**
 * 错误处理Hook
 * 提供统一的错误处理、Toast通知和加载状态管理
 */
export function useErrorHandler() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  /**
   * 添加Toast消息
   */
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      autoClose: true,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  /**
   * 移除Toast消息
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  /**
   * 清除所有Toast消息
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * 显示成功消息
   */
  const showSuccess = useCallback((title: string, message?: string) => {
    return addToast({
      type: 'success',
      title,
      message,
    });
  }, [addToast]);

  /**
   * 显示错误消息
   */
  const showError = useCallback((title: string, message?: string, autoClose = true) => {
    return addToast({
      type: 'error',
      title,
      message,
      autoClose,
      duration: autoClose ? 8000 : undefined, // 错误消息显示更长时间
    });
  }, [addToast]);

  /**
   * 显示警告消息
   */
  const showWarning = useCallback((title: string, message?: string) => {
    return addToast({
      type: 'warning',
      title,
      message,
      duration: 6000,
    });
  }, [addToast]);

  /**
   * 显示信息消息
   */
  const showInfo = useCallback((title: string, message?: string) => {
    return addToast({
      type: 'info',
      title,
      message,
    });
  }, [addToast]);

  /**
   * 处理错误并显示相应的Toast消息
   */
  const handleError = useCallback((error: any, context?: string) => {
    const result = errorHandler.handleError(error);
    
    // 构建错误标题
    let title = '操作失败';
    if (context) {
      title = `${context}失败`;
    }

    // 根据错误类型调整消息
    switch (result.errorType) {
      case ErrorType.API_KEY_ERROR:
        title = 'API密钥错误';
        break;
      case ErrorType.NETWORK_ERROR:
        title = '网络连接失败';
        break;
      case ErrorType.TIMEOUT_ERROR:
        title = '请求超时';
        break;
      case ErrorType.QUOTA_ERROR:
        title = 'API配额不足';
        break;
      case ErrorType.VALIDATION_ERROR:
        title = '输入验证失败';
        break;
      case ErrorType.PARSING_ERROR:
        title = '数据解析失败';
        break;
      case ErrorType.STORAGE_ERROR:
        title = '存储空间不足';
        break;
    }

    showError(title, result.userMessage, result.errorType !== ErrorType.API_KEY_ERROR);
    
    return result;
  }, [showError]);

  /**
   * 带错误处理的异步操作执行器
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorContext?: string;
      showSuccessToast?: boolean;
    }
  ): Promise<T | null> => {
    const {
      loadingMessage = '处理中...',
      successMessage,
      errorContext,
      showSuccessToast = false,
    } = options || {};

    try {
      setIsLoading(true);
      setLoadingMessage(loadingMessage);

      const result = await errorHandler.executeWithRetry(operation);

      if (successMessage && showSuccessToast) {
        showSuccess('操作成功', successMessage);
      }

      return result;
    } catch (error) {
      handleError(error, errorContext);
      return null;
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [handleError, showSuccess]);

  /**
   * 设置加载状态
   */
  const setLoadingState = useCallback((loading: boolean, message?: string) => {
    setIsLoading(loading);
    setLoadingMessage(message || '');
  }, []);

  return {
    // Toast相关
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // 错误处理
    handleError,
    executeWithErrorHandling,
    
    // 加载状态
    isLoading,
    loadingMessage,
    setLoadingState,
  };
}

export default useErrorHandler;