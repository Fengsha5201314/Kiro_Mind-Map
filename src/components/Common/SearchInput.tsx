/**
 * 搜索输入组件
 * 集成防抖功能的搜索输入框
 */

import React, { useState, useCallback } from 'react';
import { useDebounceSearch } from '../../hooks/useDebounceSearch';

// 搜索输入组件属性
export interface SearchInputProps {
  // 搜索回调函数
  onSearch: (query: string) => void;
  // 占位符文本
  placeholder?: string;
  // 防抖延迟（毫秒）
  delay?: number;
  // 最小搜索长度
  minLength?: number;
  // 是否启用智能防抖
  smartDebounce?: boolean;
  // 是否显示搜索历史
  showHistory?: boolean;
  // 是否显示清空按钮
  showClearButton?: boolean;
  // 是否显示搜索统计
  showStats?: boolean;
  // 自定义样式类名
  className?: string;
  // 是否禁用
  disabled?: boolean;
}

/**
 * 搜索输入组件
 */
const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = '搜索...',
  delay = 300,
  minLength = 1,
  smartDebounce = false,
  showHistory = true,
  showClearButton = true,
  showStats = false,
  className = '',
  disabled = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 使用防抖搜索Hook
  const {
    query,
    debouncedQuery,
    isSearching,
    history,
    stats,
    setQuery,
    clearSearch,
    searchFromHistory,
    clearHistory,
    getSuggestions
  } = useDebounceSearch(onSearch, {
    delay,
    minLength,
    smartDebounce,
    enableHistory: showHistory
  });

  // 处理输入变化
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    
    // 显示建议
    if (value.trim() && showHistory) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [setQuery, showHistory]);

  // 处理键盘事件
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, []);

  // 处理输入框焦点
  const handleFocus = useCallback(() => {
    if (query.trim() && showHistory && history.length > 0) {
      setShowSuggestions(true);
    }
  }, [query, showHistory, history.length]);

  // 处理输入框失焦
  const handleBlur = useCallback(() => {
    // 延迟隐藏建议，允许点击建议项
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  // 处理建议项点击
  const handleSuggestionClick = useCallback((suggestion: string) => {
    searchFromHistory(suggestion);
    setShowSuggestions(false);
  }, [searchFromHistory]);

  // 处理清空按钮点击
  const handleClearClick = useCallback(() => {
    clearSearch();
    setShowSuggestions(false);
  }, [clearSearch]);

  // 获取当前建议
  const suggestions = getSuggestions(query, 5);

  return (
    <div className={`relative ${className}`}>
      {/* 搜索输入框 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${isSearching ? 'bg-blue-50' : 'bg-white'}
          `}
        />
        
        {/* 搜索图标/加载动画 */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          ) : (
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        {/* 清空按钮 */}
        {showClearButton && query && (
          <button
            onClick={handleClearClick}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索建议下拉框 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="py-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </div>
              </button>
            ))}
            
            {/* 清空历史按钮 */}
            <div className="border-t border-gray-200 mt-1 pt-1">
              <button
                onClick={clearHistory}
                className="w-full px-4 py-2 text-left text-xs text-gray-500 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                清空搜索历史
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索统计信息（开发模式） */}
      {showStats && process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500">
          <div>当前查询: "{query}"</div>
          <div>防抖查询: "{debouncedQuery}"</div>
          <div>搜索次数: {stats.totalSearches}</div>
          <div>上次耗时: {stats.lastSearchTime.toFixed(2)}ms</div>
          <div>平均延迟: {stats.averageDelay.toFixed(2)}ms</div>
          {smartDebounce && <div className="text-blue-500">智能防抖已启用</div>}
        </div>
      )}
    </div>
  );
};

export default SearchInput;