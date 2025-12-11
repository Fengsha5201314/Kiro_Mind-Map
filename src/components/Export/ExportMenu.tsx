/**
 * 导出菜单组件 - 提供多种格式的导出选项
 */

import React, { useState } from 'react';
import { Download, FileImage, FileText, Code, AlertCircle } from 'lucide-react';
import { MindMapData, ExportFormat } from '../../types/mindmap';
import { exportService, ExportError } from '../../services/exportService';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import Toast from '../Common/Toast';

// 导出选项配置
interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

// 导出菜单属性
interface ExportMenuProps {
  mindMapData: MindMapData | null;
  canvasRef: React.RefObject<HTMLElement>;
  isOpen: boolean;
  onClose: () => void;
}

// 导出状态
interface ExportState {
  isExporting: boolean;
  currentFormat: ExportFormat | null;
  error: string | null;
  success: string | null;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  mindMapData,
  canvasRef,
  isOpen,
  onClose
}) => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    currentFormat: null,
    error: null,
    success: null
  });

  // 导出选项配置
  const exportOptions: ExportOption[] = [
    {
      format: 'png',
      label: 'PNG 图片',
      description: '导出为高质量PNG图片，适合分享和展示',
      icon: <FileImage className="w-5 h-5" />,
      extension: 'png'
    },
    {
      format: 'json',
      label: 'JSON 数据',
      description: '导出为JSON格式，保留完整的数据结构',
      icon: <Code className="w-5 h-5" />,
      extension: 'json'
    },
    {
      format: 'markdown',
      label: 'Markdown 文档',
      description: '导出为Markdown格式，便于文档编辑',
      icon: <FileText className="w-5 h-5" />,
      extension: 'md'
    }
  ];

  // 生成文件名
  const generateFileName = (format: ExportFormat): string => {
    const title = mindMapData?.title || '思维导图';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const option = exportOptions.find(opt => opt.format === format);
    return `${title}_${timestamp}.${option?.extension || format}`;
  };

  // 处理导出
  const handleExport = async (format: ExportFormat) => {
    if (!mindMapData) {
      setExportState(prev => ({
        ...prev,
        error: '没有可导出的思维导图数据'
      }));
      return;
    }

    setExportState({
      isExporting: true,
      currentFormat: format,
      error: null,
      success: null
    });

    try {
      const filename = generateFileName(format);

      switch (format) {
        case 'png':
          if (!canvasRef.current) {
            throw new ExportError('画布元素不存在', 'CANVAS_NOT_FOUND');
          }
          await exportService.exportToPNG(canvasRef.current, filename);
          break;

        case 'json':
          await exportService.exportToJSON(mindMapData, filename);
          break;

        case 'markdown':
          await exportService.exportToMarkdown(mindMapData, filename);
          break;

        default:
          throw new ExportError(`不支持的导出格式: ${format}`, 'UNSUPPORTED_FORMAT');
      }

      setExportState({
        isExporting: false,
        currentFormat: null,
        error: null,
        success: `成功导出为 ${format.toUpperCase()} 格式`
      });

      // 3秒后自动关闭成功提示
      setTimeout(() => {
        setExportState(prev => ({ ...prev, success: null }));
      }, 3000);

    } catch (error) {
      console.error('导出失败:', error);
      
      let errorMessage = '导出失败';
      if (error instanceof ExportError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = `导出失败: ${error.message}`;
      }

      setExportState({
        isExporting: false,
        currentFormat: null,
        error: errorMessage,
        success: null
      });
    }
  };

  // 清除错误状态
  const clearError = () => {
    setExportState(prev => ({ ...prev, error: null }));
  };

  // 清除成功状态
  const clearSuccess = () => {
    setExportState(prev => ({ ...prev, success: null }));
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="导出思维导图">
        <div className="space-y-4">
          {/* 导出选项列表 */}
          <div className="space-y-3">
            {exportOptions.map((option) => (
              <div
                key={option.format}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-600 mt-1">
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {option.label}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(option.format)}
                    disabled={exportState.isExporting || !mindMapData}
                    className="ml-4"
                  >
                    {exportState.isExporting && exportState.currentFormat === option.format ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>导出中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>导出</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 提示信息 */}
          {!mindMapData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  请先创建或加载思维导图后再进行导出
                </span>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={exportState.isExporting}
            >
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      {/* 错误提示 */}
      {exportState.error && (
        <Toast
          toast={{
            id: 'export-error',
            type: 'error',
            title: '导出失败',
            message: exportState.error,
            duration: 5000
          }}
          onClose={() => clearError()}
        />
      )}

      {/* 成功提示 */}
      {exportState.success && (
        <Toast
          toast={{
            id: 'export-success',
            type: 'success',
            title: '导出成功',
            message: exportState.success,
            duration: 3000
          }}
          onClose={() => clearSuccess()}
        />
      )}
    </>
  );
};