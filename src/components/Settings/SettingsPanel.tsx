/**
 * 设置面板组件
 * 集成API密钥配置和其他设置选项
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { ApiKeyConfig } from './ApiKeyConfig';
import { ModelSelector } from './ModelSelector';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import { ToastContainer, ToastMessage } from '../Common/Toast';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    setTheme,
    resetSettings,
    loadSettings,
    exportSettings,
    importSettings
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'api' | 'general' | 'advanced'>('api');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [importData, setImportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // 组件挂载时加载设置
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

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

  // 处理主题切换
  const handleThemeChange = async (theme: 'light' | 'dark') => {
    try {
      await setTheme(theme);
      showToastMessage('主题设置已保存');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '主题设置失败';
      showToastMessage(errorMessage, 'error');
    }
  };

  // 处理设置更新
  const handleSettingUpdate = async (key: string, value: any) => {
    try {
      await updateSettings({ [key]: value });
      showToastMessage('设置已保存');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '设置保存失败';
      showToastMessage(errorMessage, 'error');
    }
  };

  // 处理设置重置
  const handleResetSettings = async () => {
    if (!confirm('确定要重置所有设置吗？此操作不可撤销。')) {
      return;
    }

    try {
      await resetSettings();
      showToastMessage('设置已重置为默认值');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '设置重置失败';
      showToastMessage(errorMessage, 'error');
    }
  };

  // 处理设置导出
  const handleExportSettings = () => {
    try {
      const settingsData = exportSettings();
      const dataStr = JSON.stringify(settingsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mindmap-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToastMessage('设置已导出');
    } catch (error) {
      showToastMessage('设置导出失败', 'error');
    }
  };

  // 处理设置导入
  const handleImportSettings = async () => {
    try {
      const settingsData = JSON.parse(importData);
      await importSettings(settingsData);
      setImportData('');
      setShowImportDialog(false);
      showToastMessage('设置已导入');
    } catch (error) {
      showToastMessage('设置导入失败，请检查数据格式', 'error');
    }
  };

  // 标签页配置
  const tabs = [
    { id: 'api' as const, label: 'API配置', icon: '🔑' },
    { id: 'general' as const, label: '常规设置', icon: '⚙️' },
    { id: 'advanced' as const, label: '高级设置', icon: '🔧' },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="设置"
        size="xl"
      >
        <div className="flex h-96">
          {/* 左侧标签页导航 */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 pr-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 pl-6 overflow-y-auto">
            {activeTab === 'api' && (
              <div className="space-y-6">
                <ApiKeyConfig />
                <ModelSelector />
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* 主题设置 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    外观设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        主题模式
                      </label>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleThemeChange('light')}
                          disabled={isLoading}
                          className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                            settings.theme === 'light'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span className="mr-2">☀️</span>
                          浅色模式
                        </button>
                        <button
                          onClick={() => handleThemeChange('dark')}
                          disabled={isLoading}
                          className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                            settings.theme === 'dark'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span className="mr-2">🌙</span>
                          深色模式
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 功能设置 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    功能设置
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          自动保存
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          编辑思维导图时自动保存更改
                        </p>
                      </div>
                      <button
                        onClick={() => handleSettingUpdate('autoSave', !settings.autoSave)}
                        disabled={isLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.autoSave ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          显示小地图
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          在画布右下角显示导航小地图
                        </p>
                      </div>
                      <button
                        onClick={() => handleSettingUpdate('showMinimap', !settings.showMinimap)}
                        disabled={isLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.showMinimap ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.showMinimap ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          启用动画
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          节点展开/折叠时显示动画效果
                        </p>
                      </div>
                      <button
                        onClick={() => handleSettingUpdate('enableAnimation', !settings.enableAnimation)}
                        disabled={isLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.enableAnimation ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.enableAnimation ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                {/* 性能设置 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    性能设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        最大节点数量: {settings.maxNodes}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="100"
                        value={settings.maxNodes}
                        onChange={(e) => handleSettingUpdate('maxNodes', parseInt(e.target.value))}
                        disabled={isLoading}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>100</span>
                        <span>5000</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        最大深度层级: {settings.maxDepth}
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="15"
                        step="1"
                        value={settings.maxDepth}
                        onChange={(e) => handleSettingUpdate('maxDepth', parseInt(e.target.value))}
                        disabled={isLoading}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>3</span>
                        <span>15</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 数据管理 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    数据管理
                  </h3>
                  <div className="space-y-3">
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportSettings}
                        disabled={isLoading}
                      >
                        导出设置
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImportDialog(true)}
                        disabled={isLoading}
                      >
                        导入设置
                      </Button>
                    </div>
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetSettings}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                      >
                        重置所有设置
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 错误信息显示 */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 导入设置对话框 */}
      <Modal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        title="导入设置"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              粘贴设置数据（JSON格式）
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="请粘贴导出的设置JSON数据..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleImportSettings}
              disabled={!importData.trim()}
            >
              导入
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast 提示 */}
      <ToastContainer
        toasts={toasts}
        onClose={handleCloseToast}
        position="top-right"
      />
    </>
  );
};

export default SettingsPanel;