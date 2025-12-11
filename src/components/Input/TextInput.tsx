import React, { useState, useRef, useEffect } from 'react';
import { Type, Copy, Trash2, AlertCircle } from 'lucide-react';

// 文本输入组件属性
interface TextInputProps {
  onTextSubmit?: (text: string) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showWordCount?: boolean;
  showCharCount?: boolean;
  allowEmpty?: boolean;
}

// 默认配置
const DEFAULT_MAX_LENGTH = 50000; // 50k字符
const DEFAULT_MIN_LENGTH = 10;
const DEFAULT_PLACEHOLDER = '请输入或粘贴您的文本内容...';

const TextInput: React.FC<TextInputProps> = ({
  onTextSubmit,
  onTextChange,
  placeholder = DEFAULT_PLACEHOLDER,
  maxLength = DEFAULT_MAX_LENGTH,
  minLength = DEFAULT_MIN_LENGTH,
  className = '',
  autoFocus = false,
  disabled = false,
  showWordCount = true,
  showCharCount = true,
  allowEmpty = false
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // 验证文本
  const validateText = (inputText: string): string | null => {
    const trimmedText = inputText.trim();

    // 检查是否为空
    if (!allowEmpty && trimmedText.length === 0) {
      return '请输入文本内容';
    }

    // 检查最小长度
    if (trimmedText.length > 0 && trimmedText.length < minLength) {
      return `文本长度至少需要 ${minLength} 个字符`;
    }

    // 检查最大长度
    if (inputText.length > maxLength) {
      return `文本长度不能超过 ${maxLength} 个字符`;
    }

    return null;
  };

  // 处理文本变化
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    
    // 检查长度限制
    if (newText.length > maxLength) {
      return; // 不允许超过最大长度
    }

    setText(newText);
    setError(null);
    onTextChange?.(newText);
  };

  // 处理粘贴事件
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    const currentText = text;
    const selectionStart = textareaRef.current?.selectionStart || 0;
    const selectionEnd = textareaRef.current?.selectionEnd || 0;
    
    // 计算粘贴后的文本
    const newText = 
      currentText.slice(0, selectionStart) + 
      pastedText + 
      currentText.slice(selectionEnd);

    // 检查长度限制
    if (newText.length > maxLength) {
      event.preventDefault();
      setError(`粘贴的内容过长，将超过 ${maxLength} 字符限制`);
      return;
    }

    setError(null);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter 或 Cmd+Enter 提交
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  };

  // 提交文本
  const handleSubmit = () => {
    const validationError = validateText(text);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedText = text.trim();
    onTextSubmit?.(trimmedText);
  };

  // 清空文本
  const handleClear = () => {
    setText('');
    setError(null);
    onTextChange?.('');
    textareaRef.current?.focus();
  };

  // 复制文本
  const handleCopy = async () => {
    if (text.trim()) {
      try {
        await navigator.clipboard.writeText(text);
        // 可以添加成功提示
      } catch (err) {
        console.error('复制失败:', err);
      }
    }
  };

  // 统计字数
  const getWordCount = (inputText: string): number => {
    if (!inputText.trim()) return 0;
    
    // 中文字符按字符计算，英文按单词计算
    const chineseChars = (inputText.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = inputText
      .replace(/[\u4e00-\u9fff]/g, '') // 移除中文字符
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    
    return chineseChars + englishWords;
  };

  // 自动调整高度
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(120, Math.min(400, textarea.scrollHeight))}px`;
    }
  };

  // 文本变化时调整高度
  useEffect(() => {
    adjustHeight();
  }, [text]);

  const wordCount = getWordCount(text);
  const charCount = text.length;
  const isValid = !validateText(text);

  return (
    <div className={`w-full ${className}`}>
      {/* 文本输入区域 */}
      <div className="relative">
        <div
          className={`
            relative border rounded-lg transition-colors
            ${isFocused 
              ? 'border-blue-500 ring-2 ring-blue-200' 
              : error 
                ? 'border-red-500' 
                : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          `}
        >
          {/* 工具栏 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Type className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">文本输入</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {text.trim() && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="复制文本"
                    disabled={disabled}
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  <button
                    onClick={handleClear}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="清空文本"
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 文本区域 */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full px-4 py-3 resize-none border-none outline-none rounded-b-lg
              ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
              placeholder-gray-400 text-gray-900
            `}
            style={{ minHeight: '120px', maxHeight: '400px' }}
          />
        </div>

        {/* 字符计数和状态 */}
        <div className="flex items-center justify-between mt-2 text-sm">
          <div className="flex items-center space-x-4">
            {showCharCount && (
              <span className={`${charCount > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
                {charCount.toLocaleString()} / {maxLength.toLocaleString()} 字符
              </span>
            )}
            
            {showWordCount && text.trim() && (
              <span className="text-gray-500">
                {wordCount.toLocaleString()} 字
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* 快捷键提示 */}
            {!disabled && (
              <span className="text-gray-400 text-xs">
                Ctrl+Enter 提交
              </span>
            )}

            {/* 提交按钮 */}
            {onTextSubmit && (
              <button
                onClick={handleSubmit}
                disabled={disabled || !isValid || !text.trim()}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${isValid && text.trim() && !disabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                提交文本
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 使用提示 */}
      {!text && !error && (
        <div className="mt-2 text-sm text-gray-500">
          <p>支持粘贴文本内容，或直接输入。使用 Ctrl+Enter 快速提交。</p>
        </div>
      )}
    </div>
  );
};

export default TextInput;