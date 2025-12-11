import React, { useState } from 'react';
import { Zap, Type, Upload, Sparkles, ArrowRight } from 'lucide-react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import TextInput from './TextInput';
import FileUploader from './FileUploader';
import { ParseResult } from '../../services/fileParserService';

// 输入方式类型
type InputMethod = 'topic' | 'text' | 'file';

// 一键生成对话框属性
interface QuickGenerateProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: GenerateData) => void;
  loading?: boolean;
  isGenerating?: boolean;
}

// 生成数据接口
export interface GenerateData {
  method: InputMethod;
  content: string;
  metadata?: {
    topic?: string;
    files?: ParseResult[];
    sourceType: 'topic' | 'text' | 'file';
  };
}

// 输入方式配置
const INPUT_METHODS = [
  {
    id: 'topic' as InputMethod,
    title: '主题生成',
    description: '输入一个主题，AI将为您生成相关的思维导图大纲',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-100'
  },
  {
    id: 'text' as InputMethod,
    title: '文本输入',
    description: '粘贴或输入文本内容，AI将分析并生成思维导图',
    icon: Type,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-100'
  },
  {
    id: 'file' as InputMethod,
    title: '文件导入',
    description: '上传PDF、Word、Markdown等文件，自动提取内容生成思维导图',
    icon: Upload,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-100'
  }
];

const QuickGenerate: React.FC<QuickGenerateProps> = ({
  isOpen,
  onClose,
  onGenerate,
  loading = false
}) => {
  const [selectedMethod, setSelectedMethod] = useState<InputMethod>('topic');
  const [topicText, setTopicText] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fileResults, setFileResults] = useState<ParseResult[]>([]);
  const [step, setStep] = useState<'select' | 'input'>('select');

  // 重置状态
  const resetState = () => {
    setSelectedMethod('topic');
    setTopicText('');
    setTextContent('');
    setFileResults([]);
    setStep('select');
  };

  // 处理关闭
  const handleClose = () => {
    if (!loading) {
      resetState();
      onClose();
    }
  };

  // 处理方法选择
  const handleMethodSelect = (method: InputMethod) => {
    setSelectedMethod(method);
    setStep('input');
  };

  // 返回选择步骤
  const handleBack = () => {
    setStep('select');
  };

  // 处理生成
  const handleGenerate = () => {
    let content = '';
    let metadata: GenerateData['metadata'];

    switch (selectedMethod) {
      case 'topic':
        content = topicText.trim();
        metadata = {
          topic: content,
          sourceType: 'topic'
        };
        break;
      
      case 'text':
        content = textContent.trim();
        metadata = {
          sourceType: 'text'
        };
        break;
      
      case 'file':
        content = fileResults.map(result => result.content).join('\n\n');
        metadata = {
          files: fileResults,
          sourceType: 'file'
        };
        break;
    }

    if (content) {
      onGenerate({
        method: selectedMethod,
        content,
        metadata
      });
    }
  };

  // 检查是否可以生成
  const canGenerate = () => {
    switch (selectedMethod) {
      case 'topic':
        return topicText.trim().length >= 2;
      case 'text':
        return textContent.trim().length >= 10;
      case 'file':
        return fileResults.length > 0 && fileResults.some(r => r.content.trim().length > 0);
      default:
        return false;
    }
  };

  // 获取当前方法配置
  const currentMethod = INPUT_METHODS.find(m => m.id === selectedMethod);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="一键生成思维导图"
      size="lg"
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
    >
      <div className="space-y-6">
        {step === 'select' && (
          <>
            {/* 方法选择 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                选择输入方式
              </h3>
              
              <div className="grid gap-4">
                {INPUT_METHODS.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      className={`
                        p-4 border-2 rounded-lg text-left transition-all
                        ${method.bgColor} ${method.borderColor} ${method.hoverColor}
                        hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-lg bg-white ${method.borderColor} border`}>
                          <IconComponent className={`h-6 w-6 ${method.color}`} />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-1">
                            {method.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {method.description}
                          </p>
                        </div>
                        
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 'input' && currentMethod && (
          <>
            {/* 输入界面 */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${currentMethod.bgColor} ${currentMethod.borderColor} border`}>
                  <currentMethod.icon className={`h-5 w-5 ${currentMethod.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {currentMethod.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentMethod.description}
                  </p>
                </div>
              </div>

              {/* 根据选择的方法显示不同的输入组件 */}
              {selectedMethod === 'topic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请输入主题
                    </label>
                    <input
                      type="text"
                      value={topicText}
                      onChange={(e) => setTopicText(e.target.value)}
                      placeholder="例如：人工智能的发展历程、项目管理方法论、健康饮食指南..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      maxLength={200}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {topicText.length}/200 字符
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      💡 主题生成提示
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 尽量使用具体、明确的主题描述</li>
                      <li>• 可以包含领域、范围或特定角度</li>
                      <li>• AI将基于主题生成结构化的思维导图大纲</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedMethod === 'text' && (
                <div className="space-y-4">
                  <TextInput
                    onTextChange={setTextContent}
                    placeholder="请输入或粘贴您要分析的文本内容..."
                    maxLength={50000}
                    minLength={10}
                    showWordCount={true}
                    showCharCount={true}
                    disabled={loading}
                  />
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      📝 文本输入提示
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• 支持中文和英文内容</li>
                      <li>• 内容越详细，生成的思维导图越丰富</li>
                      <li>• AI将自动提取关键信息和层次结构</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedMethod === 'file' && (
                <div className="space-y-4">
                  <FileUploader
                    onFilesParsed={setFileResults}
                    maxFiles={3}
                    maxFileSize={50 * 1024 * 1024} // 50MB
                  />
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-900 mb-2">
                      📁 文件导入提示
                    </h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• 支持 PDF、Word、Markdown、文本文件</li>
                      <li>• 可同时上传多个文件，内容将合并分析</li>
                      <li>• 文件内容将自动提取并生成思维导图</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div>
          {step === 'input' && (
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={loading}
            >
              返回选择
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </Button>

          {step === 'input' && (
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!canGenerate() || loading}
              loading={loading}
              icon={<Zap className="h-4 w-4" />}
            >
              {loading ? '生成中...' : '开始生成'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default QuickGenerate;