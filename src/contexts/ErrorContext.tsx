import React, { createContext, useContext, ReactNode } from 'react';
import { ToastContainer } from '../components/Common/Toast';
import Loading from '../components/Common/Loading';
import useErrorHandler, { ToastMessage } from '../hooks/useErrorHandler';
import { ErrorHandlingResult } from '../services/errorHandler';

/**
 * 错误处理上下文接口
 */
interface ErrorContextType {
  // Toast相关
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string, autoClose?: boolean) => string;
  showWarning: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
  
  // 错误处理
  handleError: (error: any, context?: string) => ErrorHandlingResult;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorContext?: string;
      showSuccessToast?: boolean;
    }
  ) => Promise<T | null>;
  
  // 加载状态
  isLoading: boolean;
  loadingMessage: string;
  setLoadingState: (loading: boolean, message?: string) => void;
}

/**
 * 错误处理上下文
 */
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

/**
 * 错误处理Provider组件
 */
interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const errorHandler = useErrorHandler();

  return (
    <ErrorContext.Provider value={errorHandler}>
      {children}
      
      {/* Toast容器 */}
      <ToastContainer
        toasts={errorHandler.toasts}
        onClose={errorHandler.removeToast}
        position="top-right"
      />
      
      {/* 全局加载遮罩 */}
      {errorHandler.isLoading && (
        <Loading
          overlay
          size="lg"
          text={errorHandler.loadingMessage}
        />
      )}
    </ErrorContext.Provider>
  );
};

/**
 * 使用错误处理上下文的Hook
 */
export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError必须在ErrorProvider内部使用');
  }
  return context;
};

export default ErrorContext;