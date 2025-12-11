import { useState, useEffect } from 'react';
import { Layout, Button, Loading, SettingsPanel } from './components';
import { FileUploader, TextInput, QuickGenerate } from './components/Input';
import { GenerateData } from './components/Input/QuickGenerate';
import { Canvas } from './components/MindMap';
import { Sidebar } from './components/Layout';

import { initializeSettings, useSettingsStore } from './stores/settingsStore';
import { useMindMapStore } from './stores/mindmapStore';
import { useHistoryStore } from './stores/historyStore';
import { ParseResult } from './services/fileParserService';
import { geminiService } from './services/geminiService';
import { mindMapService } from './services/mindmapService';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import ErrorBoundary from './components/Common/ErrorBoundary';

function AppContent() {

  const [showSettings, setShowSettings] = useState(false);
  const [showQuickGenerate, setShowQuickGenerate] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'text' | 'topic'>('file');
  const [textContent, setTextContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 使用错误处理上下文
  const { 
    showError, 
    showInfo, 
    executeWithErrorHandling
  } = useError();

  // 使用状态管理
  const { apiKey } = useSettingsStore();
  const { 
    currentMindMap, 
    setMindMap, 
    setLoading, 
    setError, 
    clear 
  } = useMindMapStore();
  const {
    mindMaps,
    isLoading: historyLoading,
    loadHistory,
    addToHistory,
    removeFromHistory,
    getMindMapById
  } = useHistoryStore();

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleNewMindMapClick = () => {
    setShowQuickGenerate(true);
  };

  const handleExportClick = () => {
    showInfo('导出功能', '导出功能正在开发中...');
  };

  const handleMindMapSelect = async (mindMap: any) => {
    await executeWithErrorHandling(
      async () => {
        const fullMindMap = await getMindMapById(mindMap.id);
        if (!fullMindMap) {
          throw new Error('无法找到该思维导图数据');
        }
        setMindMap(fullMindMap);
        setShowSidebar(false);
        return fullMindMap;
      },
      {
        loadingMessage: '正在加载思维导图...',
        successMessage: `已加载思维导图: ${mindMap.title}`,
        errorContext: '加载思维导图',
        showSuccessToast: true,
      }
    );
  };

  const handleMindMapDelete = async (id: string) => {
    await executeWithErrorHandling(
      async () => {
        await removeFromHistory(id);
        
        // 如果删除的是当前显示的思维导图，清空当前状态
        if (currentMindMap && currentMindMap.id === id) {
          clear();
        }
      },
      {
        loadingMessage: '正在删除思维导图...',
        successMessage: '思维导图已删除',
        errorContext: '删除思维导图',
        showSuccessToast: true,
      }
    );
  };

  const handleSaveCurrentMindMap = async () => {
    if (!currentMindMap) {
      showError('保存失败', '没有可保存的思维导图');
      return;
    }

    await executeWithErrorHandling(
      async () => {
        await addToHistory(currentMindMap);
      },
      {
        loadingMessage: '正在保存思维导图...',
        successMessage: `思维导图"${currentMindMap.title}"已保存到历史记录`,
        errorContext: '保存思维导图',
        showSuccessToast: true,
      }
    );
  };

  const handleShowHistory = () => {
    setShowSidebar(true);
  };

  // 处理文件解析完成
  const handleFilesParsed = async (results: ParseResult[]) => {
    if (results.length === 0) return;

    // 检查API密钥
    if (!apiKey) {
      showError('API密钥未配置', '请先在设置中配置Gemini API密钥');
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setLoading(true);
    setError(null);

    await executeWithErrorHandling(
      async () => {
        // 合并所有文件的内容
        const combinedContent = results
          .map(result => `文件: ${result.fileName}\n内容: ${result.content}`)
          .join('\n\n');

        // 调用AI生成思维导图
        const mindMapStructure = await geminiService.generateMindMap(combinedContent, apiKey);
        
        // 转换为MindMapData格式
        const mindMapData = mindMapService.convertStructureToMindMap(mindMapStructure);
        
        // 设置到状态中
        setMindMap(mindMapData);
        
        // 自动保存到历史记录
        try {
          await addToHistory(mindMapData);
        } catch (saveError) {
          console.warn('自动保存到历史记录失败:', saveError);
        }
        
        return mindMapData;
      },
      {
        loadingMessage: '正在使用AI生成思维导图...',
        successMessage: '思维导图已生成完成',
        errorContext: '生成思维导图',
        showSuccessToast: true,
      }
    );

    setIsGenerating(false);
    setLoading(false);
  };

  // 处理文本输入生成
  const handleTextGenerate = async () => {
    if (!textContent.trim()) {
      showError('内容为空', '请输入要生成思维导图的文本内容');
      return;
    }

    if (!apiKey) {
      showError('API密钥未配置', '请先在设置中配置Gemini API密钥');
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setLoading(true);
    setError(null);

    const result = await executeWithErrorHandling(
      async () => {
        // 调用AI生成思维导图
        const mindMapStructure = await geminiService.generateMindMap(textContent, apiKey);
        
        // 转换为MindMapData格式
        const mindMapData = mindMapService.convertStructureToMindMap(mindMapStructure);
        
        // 设置到状态中
        setMindMap(mindMapData);
        
        // 自动保存到历史记录
        try {
          await addToHistory(mindMapData);
        } catch (saveError) {
          console.warn('自动保存到历史记录失败:', saveError);
        }
        
        return mindMapData;
      },
      {
        loadingMessage: '正在使用AI生成思维导图...',
        successMessage: '思维导图已生成完成',
        errorContext: '生成思维导图',
        showSuccessToast: true,
      }
    );

    if (result) {
      // 清空输入内容
      setTextContent('');
    }

    setIsGenerating(false);
    setLoading(false);
  };

  // 处理主题生成
  const handleTopicGenerate = async (data: GenerateData) => {
    const content = data.content;
    if (!content.trim()) {
      showError('内容为空', '请输入要生成思维导图的内容');
      return;
    }

    if (!apiKey) {
      showError('API密钥未配置', '请先在设置中配置Gemini API密钥');
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setLoading(true);
    setError(null);
    setShowQuickGenerate(false);

    await executeWithErrorHandling(
      async () => {
        let mindMapStructure;
        
        // 根据生成方式调用不同的API
        if (data.method === 'topic') {
          mindMapStructure = await geminiService.generateFromTopic(content, apiKey);
        } else {
          mindMapStructure = await geminiService.generateMindMap(content, apiKey);
        }
        
        // 转换为MindMapData格式
        const mindMapData = mindMapService.convertStructureToMindMap(mindMapStructure);
        
        // 设置到状态中
        setMindMap(mindMapData);
        
        // 自动保存到历史记录
        try {
          await addToHistory(mindMapData);
        } catch (saveError) {
          console.warn('自动保存到历史记录失败:', saveError);
        }
        
        return mindMapData;
      },
      {
        loadingMessage: '正在使用AI生成思维导图...',
        successMessage: '思维导图已生成完成',
        errorContext: '生成思维导图',
        showSuccessToast: true,
      }
    );

    setIsGenerating(false);
    setLoading(false);
  };

  // 处理文件上传错误
  const handleFileError = (error: string) => {
    showError('文件处理失败', error);
  };

  // 初始化设置和历史记录
  useEffect(() => {
    const initialize = async () => {
      await executeWithErrorHandling(
        async () => {
          await initializeSettings();
        },
        {
          errorContext: '设置初始化',
        }
      );

      await executeWithErrorHandling(
        async () => {
          await loadHistory();
        },
        {
          errorContext: '历史记录加载',
        }
      );
    };

    initialize();
  }, [loadHistory, executeWithErrorHandling]);

  return (
    <>
      <Layout
        mindMaps={mindMaps}
        onMindMapSelect={handleMindMapSelect}
        onMindMapDelete={handleMindMapDelete}
        onSettingsClick={handleSettingsClick}
        onNewMindMapClick={handleNewMindMapClick}
        onExportClick={handleExportClick}
        onSaveClick={handleSaveCurrentMindMap}
        onHistoryClick={handleShowHistory}
        showSaveButton={!!currentMindMap}
        isHistoryLoading={historyLoading}
      >
        <div className="h-full flex flex-col">
          {/* 主内容区域 */}
          {currentMindMap ? (
            // 显示思维导图 - 确保容器有明确的高度
            <div className="flex-1 relative w-full h-full" style={{ minHeight: 0 }}>
              <div className="absolute inset-0">
                <Canvas />
              </div>
              {isGenerating && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
                  <Loading text="正在生成思维导图..." />
                </div>
              )}
            </div>
          ) : (
            // 显示输入界面
            <div className="flex-1 container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    AI思维导图生成器
                  </h2>
                  <p className="text-gray-600">
                    上传文件或输入文本，让AI为您生成专业的思维导图
                  </p>
                </div>

                {/* 输入模式切换 */}
                <div className="flex justify-center mb-8">
                  <div className="bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setInputMode('file')}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        inputMode === 'file'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      文件上传
                    </button>
                    <button
                      onClick={() => setInputMode('text')}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        inputMode === 'text'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      文本输入
                    </button>
                  </div>
                </div>

                {/* 输入区域 */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  {inputMode === 'file' ? (
                    <FileUploader
                      onFilesParsed={handleFilesParsed}
                      onError={handleFileError}
                      maxFiles={5}
                      maxFileSize={50 * 1024 * 1024} // 50MB
                    />
                  ) : (
                    <div className="space-y-4">
                      <TextInput
                        onTextChange={setTextContent}
                        placeholder="请输入要生成思维导图的文本内容..."
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleTextGenerate}
                          disabled={!textContent.trim() || isGenerating}
                          className="min-w-32"
                        >
                          {isGenerating ? '生成中...' : '生成思维导图'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* API密钥提示 */}
                {!apiKey && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          请先在设置中配置Gemini API密钥才能使用AI生成功能。
                          <button
                            onClick={() => setShowSettings(true)}
                            className="font-medium underline hover:text-yellow-900 ml-1"
                          >
                            立即配置
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 加载状态 */}
                {isGenerating && (
                  <div className="mt-6 flex justify-center">
                    <Loading text="正在生成思维导图，请稍候..." />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>

      {/* 一键生成对话框 */}
      <QuickGenerate
        isOpen={showQuickGenerate}
        onClose={() => setShowQuickGenerate(false)}
        onGenerate={handleTopicGenerate}
        isGenerating={isGenerating}
      />

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* 历史记录侧边栏 */}
      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        mindMaps={mindMaps}
        onMindMapSelect={handleMindMapSelect}
        onMindMapDelete={handleMindMapDelete}
        isLoading={historyLoading}
      />

    </>
  );
}

// 主App组件，包装错误边界和错误提供者
function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <AppContent />
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;