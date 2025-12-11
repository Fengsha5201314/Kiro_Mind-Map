import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

/**
 * 进度步骤状态
 */
export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

/**
 * 进度步骤接口
 */
export interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  error?: string;
}

/**
 * 进度指示器属性
 */
interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  showDescription?: boolean;
}

/**
 * 进度指示器组件
 * 显示多步骤操作的进度状态
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  className = '',
  showDescription = true,
}) => {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'active':
        return (
          <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStyles = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'active':
        return 'bg-blue-50 border-blue-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'pending':
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextStyles = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-800';
      case 'active':
        return 'text-blue-800';
      case 'error':
        return 'text-red-800';
      case 'pending':
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`flex items-start p-3 rounded-lg border ${getStepStyles(step.status)}`}
        >
          <div className="flex-shrink-0 mr-3">
            {getStepIcon(step.status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${getTextStyles(step.status)}`}>
              {step.title}
            </div>
            
            {showDescription && step.description && (
              <div className={`text-xs mt-1 ${getTextStyles(step.status)} opacity-75`}>
                {step.description}
              </div>
            )}
            
            {step.status === 'error' && step.error && (
              <div className="text-xs mt-1 text-red-600 bg-red-100 px-2 py-1 rounded">
                {step.error}
              </div>
            )}
          </div>
          
          {/* 连接线 */}
          {index < steps.length - 1 && (
            <div className="absolute left-6 mt-8 w-px h-6 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * 简化的进度条组件
 */
interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  className = '',
  color = 'blue',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${colorClasses[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * 文件处理进度组件
 */
interface FileProcessingProgressProps {
  files: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    error?: string;
  }>;
  className?: string;
}

export const FileProcessingProgress: React.FC<FileProcessingProgressProps> = ({
  files,
  className = '',
}) => {
  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.status === 'completed').length;
  const overallProgress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <ProgressBar
        progress={overallProgress}
        label={`处理文件进度 (${completedFiles}/${totalFiles})`}
        color="blue"
      />
      
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                {file.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {file.status === 'processing' && (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                {file.status === 'pending' && (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </div>
                {file.error && (
                  <div className="text-xs text-red-600 mt-1">
                    {file.error}
                  </div>
                )}
              </div>
            </div>
            
            {file.status === 'processing' && file.progress !== undefined && (
              <div className="flex-shrink-0 ml-2">
                <div className="text-xs text-gray-500">
                  {Math.round(file.progress)}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;