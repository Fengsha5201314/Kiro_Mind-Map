/**
 * 模型选择组件
 * 提供Gemini模型的选择功能
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore, SUPPORTED_MODELS, SupportedModelId } from '../../stores/settingsStore';
import { ChevronDown, Check, Zap, Star } from 'lucide-react';

interface ModelSelectorProps {
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ className = '' }) => {
  const { settings, setSelectedModel, isLoading } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModelLocal] = useState<SupportedModelId>(settings.selectedModel);

  // 同步设置中的模型选择
  useEffect(() => {
    setSelectedModelLocal(settings.selectedModel);
  }, [settings.selectedModel]);

  // 处理模型选择
  const handleModelSelect = async (modelId: SupportedModelId) => {
    try {
      setSelectedModelLocal(modelId);
      await setSelectedModel(modelId);
      setIsOpen(false);
    } catch (error) {
      console.error('设置模型失败:', error);
      // 恢复之前的选择
      setSelectedModelLocal(settings.selectedModel);
    }
  };

  // 获取当前选择的模型信息
  const currentModel = SUPPORTED_MODELS.find(model => model.id === selectedModel);

  return (
    <div className={`relative ${className}`}>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI模型选择
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          选择用于生成思维导图的Gemini模型
        </p>
      </div>

      {/* 选择器按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          w-full flex items-center justify-between px-4 py-3 
          bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
          rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-500" />
            {currentModel?.recommended && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {currentModel?.name || '未知模型'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentModel?.description || ''}
            </div>
          </div>
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {/* 下拉选项 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {SUPPORTED_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className={`
                w-full flex items-center justify-between px-4 py-3 text-left
                hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150
                ${selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                first:rounded-t-lg last:rounded-b-lg
              `}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  <Zap className={`h-4 w-4 ${
                    selectedModel === model.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  {model.recommended && (
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    selectedModel === model.id 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {model.name}
                    {model.recommended && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        推荐
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {model.description}
                  </div>
                </div>
              </div>
              {selectedModel === model.id && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 点击外部关闭下拉菜单 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 模型信息提示 */}
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">当前选择: {currentModel?.name}</p>
            <p>{currentModel?.description}</p>
            {currentModel?.recommended && (
              <p className="mt-1 text-blue-600 dark:text-blue-300">⭐ 推荐使用此模型以获得最佳性能</p>
            )}
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• 不同模型在性能和响应速度上有所差异</p>
        <p>• 如果选择的模型不可用，系统会自动尝试其他模型</p>
        <p>• 推荐模型通常具有最佳的性能和稳定性</p>
      </div>
    </div>
  );
};

export default ModelSelector;