import React, { useCallback, useState, useRef } from 'react';
import { Upload, File, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { fileParserService, ParseResult, FileParseError } from '../../services/fileParserService';

// 文件上传状态
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// 文件项接口
interface FileItem {
  id: string;
  file: File;
  status: UploadStatus;
  result?: ParseResult;
  error?: string;
  progress?: number;
}

// 文件上传组件属性
interface FileUploaderProps {
  onFilesParsed?: (results: ParseResult[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // 字节
  acceptedTypes?: string[];
  className?: string;
}

// 支持的文件类型配置
const FILE_TYPE_CONFIG = {
  'application/pdf': { icon: FileText, label: 'PDF', color: 'text-red-500' },
  'application/msword': { icon: FileText, label: 'DOC', color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    icon: FileText, 
    label: 'DOCX', 
    color: 'text-blue-500' 
  },
  'text/markdown': { icon: FileText, label: 'MD', color: 'text-green-500' },
  'text/plain': { icon: FileText, label: 'TXT', color: 'text-gray-500' },
};

// 默认配置
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain'
];

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesParsed,
  onError,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className = ''
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成文件ID
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > maxFileSize) {
      return `文件大小超过限制 (${Math.round(maxFileSize / 1024 / 1024)}MB)`;
    }

    // 检查文件类型
    const mimeType = file.type;
    const extension = file.name.toLowerCase().split('.').pop();

    // 检查MIME类型或扩展名
    const isValidMimeType = acceptedTypes.includes(mimeType);
    const isValidExtension = ['pdf', 'doc', 'docx', 'md', 'markdown', 'txt'].includes(extension || '');

    if (!isValidMimeType && !isValidExtension) {
      return '不支持的文件类型';
    }

    return null;
  };

  // 处理文件解析
  const parseFile = async (fileItem: FileItem): Promise<void> => {
    try {
      // 更新状态为上传中
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { ...f, status: 'uploading' as UploadStatus, progress: 0 }
          : f
      ));

      // 解析文件，使用进度回调
      const result = await fileParserService.parseFile(fileItem.file, (progress) => {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress: Math.round(progress) }
            : f
        ));
      });

      // 更新状态为成功
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { ...f, status: 'success' as UploadStatus, result, progress: 100 }
          : f
      ));

    } catch (error) {
      // 更新状态为错误
      const errorMessage = error instanceof FileParseError 
        ? error.message 
        : '文件解析失败';

      setFiles(prev => prev.map(f => 
        f.id === fileItem.id 
          ? { ...f, status: 'error' as UploadStatus, error: errorMessage }
          : f
      ));

      onError?.(errorMessage);
    }
  };

  // 添加文件
  const addFiles = useCallback(async (newFiles: File[]) => {
    // 检查文件数量限制
    if (files.length + newFiles.length > maxFiles) {
      onError?.(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    // 验证并创建文件项
    const validFiles: FileItem[] = [];
    
    for (const file of newFiles) {
      const error = validateFile(file);
      if (error) {
        onError?.(`${file.name}: ${error}`);
        continue;
      }

      // 检查是否已存在相同文件
      const isDuplicate = files.some(f => 
        f.file.name === file.name && f.file.size === file.size
      );
      
      if (isDuplicate) {
        onError?.(`文件 ${file.name} 已存在`);
        continue;
      }

      validFiles.push({
        id: generateFileId(),
        file,
        status: 'idle'
      });
    }

    if (validFiles.length === 0) return;

    // 添加到文件列表
    setFiles(prev => [...prev, ...validFiles]);

    // 开始解析文件
    for (const fileItem of validFiles) {
      parseFile(fileItem);
    }
  }, [files, maxFiles, maxFileSize, acceptedTypes, onError]);

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // 清空input值，允许重复选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理拖拽事件
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  // 移除文件
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 获取文件图标
  const getFileIcon = (file: File) => {
    const config = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    if (config) {
      const IconComponent = config.icon;
      return <IconComponent className={`h-5 w-5 ${config.color}`} />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 获取成功解析的结果
  const successfulResults = files
    .filter(f => f.status === 'success' && f.result)
    .map(f => f.result!);

  // 通知父组件解析结果
  React.useEffect(() => {
    if (successfulResults.length > 0) {
      onFilesParsed?.(successfulResults);
    }
  }, [successfulResults.length]);

  return (
    <div className={`w-full ${className}`}>
      {/* 文件拖拽区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          <Upload className={`h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              拖拽文件到此处或
              <button
                onClick={triggerFileSelect}
                className="text-blue-600 hover:text-blue-700 underline ml-1"
              >
                点击选择文件
              </button>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              支持 PDF、Word、Markdown、文本文件，最大 {Math.round(maxFileSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">已选择的文件</h4>
          
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3 flex-1">
                {/* 文件图标 */}
                <div className="flex-shrink-0">
                  {getFileIcon(fileItem.file)}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileItem.file.size)}
                    {fileItem.result && (
                      <span className="ml-2">
                        • {fileItem.result.wordCount} 字
                      </span>
                    )}
                  </p>
                </div>

                {/* 状态指示器 */}
                <div className="flex items-center space-x-2">
                  {fileItem.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileItem.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {fileItem.progress || 0}%
                      </span>
                    </div>
                  )}

                  {fileItem.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}

                  {fileItem.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* 移除按钮 */}
              <button
                onClick={() => removeFile(fileItem.id)}
                className="ml-3 p-1 hover:bg-gray-200 rounded-full transition-colors"
                title="移除文件"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}

          {/* 错误信息显示 */}
          {files.some(f => f.status === 'error') && (
            <div className="mt-4">
              {files
                .filter(f => f.status === 'error')
                .map(f => (
                  <div key={f.id} className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <strong>{f.file.name}:</strong> {f.error}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;