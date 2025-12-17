/**
 * 内容类型选择器组件
 * 显示检测到的内容类型，并允许用户确认或修改
 */

import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  ContentType,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_DESCRIPTIONS,
  ContentTypeDetectionResult
} from '../../types/contentType';

interface ContentTypeSelectorProps {
  detection: ContentTypeDetectionResult | null;
  selectedType: ContentType;
  onTypeChange: (type: ContentType) => void;
  disabled?: boolean;
  className?: string;
}

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  detection,
  selectedType,
  onTypeChange,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // 获取所有可用的内容类型
  const allTypes = Object.values(ContentType);

  // 获取建议的类型（检测到的类型 + 其他建议类型）
  const suggestedTypes = detection
    ? [detection.type, ...(detection.suggestedTypes || [])]
    : [];

  // 处理类型选择
  const handleTypeSelect = (type: ContentType) => {
    onTypeChange(type);
    setIsOpen(false);
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // 获取置信度文本
  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.5) return '中';
    return '低';
  };

  return (
    <div className={`relative ${className}`}>
      {/* 选择器按钮 */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3 
          border rounded-lg transition-colors
          ${disabled
            ? 'bg-gray-50 cursor-not-allowed border-gray-200'
            : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400'
          }
          ${isOpen ? 'ring-2 ring-blue-200 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">
              {CONTENT_TYPE_LABELS[selectedType]}
            </span>
            <span className="text-xs text-gray-500">
              {CONTENT_TYPE_DESCRIPTIONS[selectedType]}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 显示检测置信度 */}
          {detection && detection.type === selectedType && (
            <span
              className={`text-xs font-medium ${getConfidenceColor(detection.confidence)}`}
            >
              置信度: {getConfidenceText(detection.confidence)}
            </span>
          )}
          
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* 下拉菜单 */}
      {isOpen && !disabled && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 选项列表 */}
          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {/* 检测结果提示 */}
            {detection && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    AI 检测结果
                  </span>
                  <span className={`text-xs font-medium ${getConfidenceColor(detection.confidence)}`}>
                    置信度: {(detection.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {detection.matchedKeywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detection.matchedKeywords.slice(0, 5).map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                    {detection.matchedKeywords.length > 5 && (
                      <span className="px-2 py-0.5 text-xs text-blue-600">
                        +{detection.matchedKeywords.length - 5} 更多
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 建议的类型 */}
            {suggestedTypes.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                  推荐类型
                </div>
                {suggestedTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                      ${selectedType === type ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {CONTENT_TYPE_LABELS[type]}
                          </span>
                          {type === detection?.type && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                              AI推荐
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {CONTENT_TYPE_DESCRIPTIONS[type]}
                        </span>
                      </div>
                      {selectedType === type && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 分隔线 */}
            {suggestedTypes.length > 0 && (
              <div className="border-t border-gray-200" />
            )}

            {/* 所有类型 */}
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                所有类型
              </div>
              {allTypes
                .filter((type) => !suggestedTypes.includes(type))
                .map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                      ${selectedType === type ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 block">
                          {CONTENT_TYPE_LABELS[type]}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {CONTENT_TYPE_DESCRIPTIONS[type]}
                        </span>
                      </div>
                      {selectedType === type && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContentTypeSelector;
