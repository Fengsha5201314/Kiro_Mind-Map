/**
 * API密钥配置组件
 * 提供API密钥的输入、保存、显示和删除功能
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import Button from '../Common/Button';
import { ToastContainer, ToastMessage } from '../Common/Toast';
import { runDiagnostics } from '../../utils/apiKeyTester';

interface ApiKeyConfigProps {
  className?: string;
}

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ className = '' }) => {
  const {
    apiKeyMask,
    isLoading,
    error,
    setApiKey,
    clearApiKey,
    loadApiKey,
    setError
  } = useSettingsStore();

  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // 组件挂载时加载API密钥
  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  // 显示提示消息
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      type,
      title: message,
      duration: 3000,
      autoClose: true
    };
    setToasts(prev => [...prev, newToast]);
  };

  // 关闭Toast
  const handleCloseToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // 处理API密钥保存
  const handleSaveApiKey = async () => {
    if (!inputValue.trim()) {
      showToastMessage('请输入API密钥', 'error');
      return;
    }

    try {
      await setApiKey(inputValue.trim());
      setInputValue('');
      setShowInput(false);
      showToastMessage('API密钥保存成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API密钥保存失败';
      showToastMessage(errorMessage, 'error');
    }
  };

  // 处理API密钥删除
  const handleDeleteApiKey = async () => {
    if (!confirm('确定要删除API密钥吗？删除后将无法使用AI生成功能。')) {
      return;
    }

    try {
      await clearApiKey();
      showToastMessage('API密钥已删除');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API密钥删除失败';
      showToastMessage(errorMessage, 'error');
    }
  };

  // 处理输入框键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveApiKey();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowInput(false);
      setError(null);
    }
  };

  // 切换输入显示状态
  const toggleInput = () => {
    setShowInput(!showInput);
    setInputValue('');
    setError(null);
    setTestResults(null);
  };

  // 测试API密钥
  const handleTestApiKey = async () => {
    const { apiKey } = useSettingsStore.getState();
    
    if (!apiKey) {
      showToastMessage('请先配置API密钥', 'error');
      return;
    }

    setIsTesting(true);
    setTestResults(null);

    try {
      const results = await runDiagnostics(apiKey);
      setTestResults(results);
      
      if (results.apiKeyTest.success) {
        showToastMessage('API密钥测试成功！', 'success');
      } else {
        showToastMessage(`API密钥测试失败: ${results.apiKeyTest.error}`, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试失败';
      showToastMessage(errorMessage, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Gemini API 密钥配置
        </h3>
        <div className="flex items-center space-x-2">
          {apiKeyMask && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              已配置
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* API密钥状态显示 */}
        {apiKeyMask ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    当前API密钥
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {apiKeyMask}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestApiKey}
                  disabled={isLoading || isTesting}
                  className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                >
                  {isTesting ? '测试中...' : '测试'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleInput}
                  disabled={isLoading}
                >
                  更换
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteApiKey}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2h4a2 2 0 012 2v2M9 7h6" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              未配置API密钥
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              需要配置Gemini API密钥才能使用AI生成功能
            </p>
            <Button
              onClick={toggleInput}
              disabled={isLoading}
            >
              配置API密钥
            </Button>
          </div>
        )}

        {/* API密钥输入区域 */}
        {showInput && (
          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div>
              <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                输入Gemini API密钥
              </label>
              <input
                id="api-key-input"
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="请输入您的Gemini API密钥..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* 错误信息显示 */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleInput}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                disabled={isLoading || !inputValue.trim()}
              >
                {isLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        )}

        {/* 测试结果显示 */}
        {testResults && (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">诊断结果</h4>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${testResults.networkTest.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  网络连接: {testResults.networkTest.success ? '正常' : '失败'}
                </span>
                {testResults.networkTest.responseTime && (
                  <span className="text-xs text-gray-500">({testResults.networkTest.responseTime}ms)</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${testResults.apiKeyTest.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  API密钥: {testResults.apiKeyTest.success ? '有效' : '无效'}
                </span>
                {testResults.apiKeyTest.responseTime && (
                  <span className="text-xs text-gray-500">({testResults.apiKeyTest.responseTime}ms)</span>
                )}
              </div>
            </div>

            {testResults.recommendations.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">建议:</h5>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {testResults.recommendations.map((rec: string, index: number) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {!testResults.apiKeyTest.success && testResults.apiKeyTest.error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300">
                  错误详情: {testResults.apiKeyTest.error}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• API密钥将被加密存储在本地浏览器中</p>
          <p>• 您可以在 <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">Google AI Studio</a> 获取免费的API密钥</p>
          <p>• 密钥仅用于调用Gemini API生成思维导图，不会上传到其他服务器</p>
          <p>• 点击"测试"按钮可以诊断API密钥和网络连接问题</p>
        </div>
      </div>

      {/* Toast 提示 */}
      <ToastContainer
        toasts={toasts}
        onClose={handleCloseToast}
        position="top-right"
      />
    </div>
  );
};

export default ApiKeyConfig;