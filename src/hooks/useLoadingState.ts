import { useState, useCallback, useRef } from 'react';

/**
 * 加载状态类型
 */
export interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  error?: string;
}

/**
 * 加载操作配置
 */
export interface LoadingOperation {
  id: string;
  message: string;
  progress?: number;
}

/**
 * 加载状态管理Hook
 * 支持多个并发加载操作的状态管理
 */
export function useLoadingState() {
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const operationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 开始加载操作
   */
  const startLoading = useCallback((id: string, message: string, timeout?: number) => {
    setOperations(prev => {
      const newOperations = new Map(prev);
      newOperations.set(id, { id, message, progress: 0 });
      return newOperations;
    });

    // 设置超时
    if (timeout) {
      const timeoutId = setTimeout(() => {
        stopLoading(id, '操作超时');
      }, timeout);
      
      operationTimeouts.current.set(id, timeoutId);
    }
  }, []);

  /**
   * 更新加载进度
   */
  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    setOperations(prev => {
      const newOperations = new Map(prev);
      const operation = newOperations.get(id);
      if (operation) {
        newOperations.set(id, {
          ...operation,
          progress: Math.max(0, Math.min(100, progress)),
          message: message || operation.message,
        });
      }
      return newOperations;
    });
  }, []);

  /**
   * 停止加载操作
   */
  const stopLoading = useCallback((id: string, error?: string) => {
    setOperations(prev => {
      const newOperations = new Map(prev);
      newOperations.delete(id);
      return newOperations;
    });

    // 清除超时
    const timeoutId = operationTimeouts.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      operationTimeouts.current.delete(id);
    }

    if (error) {
      console.error(`加载操作 ${id} 失败:`, error);
    }
  }, []);

  /**
   * 清除所有加载操作
   */
  const clearAll = useCallback(() => {
    // 清除所有超时
    operationTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    operationTimeouts.current.clear();
    
    setOperations(new Map());
  }, []);

  /**
   * 获取当前加载状态
   */
  const getLoadingState = useCallback((): LoadingState => {
    const operationList = Array.from(operations.values());
    
    if (operationList.length === 0) {
      return {
        isLoading: false,
        message: '',
      };
    }

    // 如果只有一个操作，直接返回其状态
    if (operationList.length === 1) {
      const operation = operationList[0];
      return {
        isLoading: true,
        message: operation.message,
        progress: operation.progress,
      };
    }

    // 多个操作时，计算总体进度
    const totalProgress = operationList.reduce((sum, op) => sum + (op.progress || 0), 0);
    const averageProgress = totalProgress / operationList.length;

    return {
      isLoading: true,
      message: `正在处理 ${operationList.length} 个任务...`,
      progress: averageProgress,
    };
  }, [operations]);

  /**
   * 检查特定操作是否正在加载
   */
  const isOperationLoading = useCallback((id: string): boolean => {
    return operations.has(id);
  }, [operations]);

  /**
   * 获取特定操作的状态
   */
  const getOperationState = useCallback((id: string): LoadingOperation | null => {
    return operations.get(id) || null;
  }, [operations]);

  /**
   * 执行带加载状态的异步操作
   */
  const executeWithLoading = useCallback(async <T>(
    id: string,
    operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    initialMessage: string,
    timeout?: number
  ): Promise<T> => {
    try {
      startLoading(id, initialMessage, timeout);
      
      const result = await operation((progress, message) => {
        updateProgress(id, progress, message);
      });
      
      stopLoading(id);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      stopLoading(id, errorMessage);
      throw error;
    }
  }, [startLoading, updateProgress, stopLoading]);

  return {
    // 状态查询
    loadingState: getLoadingState(),
    isLoading: operations.size > 0,
    operationCount: operations.size,
    
    // 操作管理
    startLoading,
    updateProgress,
    stopLoading,
    clearAll,
    
    // 查询方法
    isOperationLoading,
    getOperationState,
    
    // 执行方法
    executeWithLoading,
  };
}

/**
 * 简化的加载状态Hook
 * 适用于单一加载操作的场景
 */
export function useSimpleLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();

  const startLoading = useCallback((loadingMessage: string) => {
    setIsLoading(true);
    setMessage(loadingMessage);
    setProgress(undefined);
    setError(undefined);
  }, []);

  const updateProgress = useCallback((newProgress: number, newMessage?: string) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  const stopLoading = useCallback((errorMessage?: string) => {
    setIsLoading(false);
    setMessage('');
    setProgress(undefined);
    setError(errorMessage);
  }, []);

  const executeWithLoading = useCallback(async <T>(
    operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    initialMessage: string
  ): Promise<T> => {
    try {
      startLoading(initialMessage);
      
      const result = await operation((progress, message) => {
        updateProgress(progress, message);
      });
      
      stopLoading();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      stopLoading(errorMessage);
      throw error;
    }
  }, [startLoading, updateProgress, stopLoading]);

  return {
    isLoading,
    message,
    progress,
    error,
    startLoading,
    updateProgress,
    stopLoading,
    executeWithLoading,
  };
}

export default useLoadingState;