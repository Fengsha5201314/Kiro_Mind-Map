/**
 * 设置组件测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApiKeyConfig } from '../components/Settings/ApiKeyConfig';
import { SettingsPanel } from '../components/Settings/SettingsPanel';
import { useSettingsStore } from '../stores/settingsStore';

// Mock settings store
vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: vi.fn(),
  SUPPORTED_MODELS: [
    {
      id: 'gemini-3-pro-preview',
      name: 'Gemini 3 Pro Preview',
      description: '最新的Gemini 3预览版，性能最强',
      recommended: true
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: '稳定的快速模型',
      recommended: false
    }
  ]
}));

const mockSettingsStore = {
  apiKey: null,
  apiKeyMask: null,
  settings: {
    theme: 'light' as const,
    language: 'zh-CN' as const,
    autoSave: true,
    showMinimap: true,
    enableAnimation: true,
    maxNodes: 1000,
    maxDepth: 10,
    selectedModel: 'gemini-3-pro-preview' as const
  },
  isLoading: false,
  error: null,
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
  loadApiKey: vi.fn(),
  setError: vi.fn(),
  updateSettings: vi.fn(),
  setTheme: vi.fn(),
  setSelectedModel: vi.fn(),
  resetSettings: vi.fn(),
  loadSettings: vi.fn(),
  exportSettings: vi.fn(),
  importSettings: vi.fn()
};

describe('设置组件测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSettingsStore as any).mockReturnValue(mockSettingsStore);
  });

  describe('ApiKeyConfig 组件', () => {
    it('应该显示未配置状态', () => {
      render(<ApiKeyConfig />);
      
      expect(screen.getByText('未配置API密钥')).toBeInTheDocument();
      expect(screen.getByText('配置API密钥')).toBeInTheDocument();
    });

    it('应该显示已配置状态', () => {
      const storeWithApiKey = {
        ...mockSettingsStore,
        apiKeyMask: 'AIza***xyz'
      };
      (useSettingsStore as any).mockReturnValue(storeWithApiKey);

      render(<ApiKeyConfig />);
      
      expect(screen.getByText('当前API密钥')).toBeInTheDocument();
      expect(screen.getByText('AIza***xyz')).toBeInTheDocument();
      expect(screen.getByText('更换')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('应该能够打开输入框', async () => {
      render(<ApiKeyConfig />);
      
      const configButton = screen.getByText('配置API密钥');
      fireEvent.click(configButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('请输入您的Gemini API密钥...')).toBeInTheDocument();
      });
    });

    it('应该能够保存API密钥', async () => {
      render(<ApiKeyConfig />);
      
      // 打开输入框
      const configButton = screen.getByText('配置API密钥');
      fireEvent.click(configButton);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText('请输入您的Gemini API密钥...');
        fireEvent.change(input, { target: { value: 'AIzaSyTest123' } });
        
        const saveButton = screen.getByText('保存');
        fireEvent.click(saveButton);
        
        expect(mockSettingsStore.setApiKey).toHaveBeenCalledWith('AIzaSyTest123');
      });
    });
  });

  describe('SettingsPanel 组件', () => {
    it('应该渲染设置面板', () => {
      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByText('设置')).toBeInTheDocument();
      expect(screen.getByText('API配置')).toBeInTheDocument();
      expect(screen.getByText('常规设置')).toBeInTheDocument();
      expect(screen.getByText('高级设置')).toBeInTheDocument();
    });

    it('应该能够切换标签页', async () => {
      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      
      const generalTab = screen.getByText('常规设置');
      fireEvent.click(generalTab);
      
      await waitFor(() => {
        expect(screen.getByText('外观设置')).toBeInTheDocument();
        expect(screen.getByText('主题模式')).toBeInTheDocument();
      });
    });

    it('应该能够切换主题', async () => {
      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      
      // 切换到常规设置标签
      const generalTab = screen.getByText('常规设置');
      fireEvent.click(generalTab);
      
      await waitFor(() => {
        const darkModeButton = screen.getByText('深色模式');
        fireEvent.click(darkModeButton);
        
        expect(mockSettingsStore.setTheme).toHaveBeenCalledWith('dark');
      });
    });

    it('应该能够切换功能设置', async () => {
      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      
      // 切换到常规设置标签
      const generalTab = screen.getByText('常规设置');
      fireEvent.click(generalTab);
      
      await waitFor(() => {
        // 查找自动保存开关（通过其父容器的文本）
        const autoSaveSection = screen.getByText('自动保存').closest('div');
        const toggleButton = autoSaveSection?.querySelector('button');
        
        if (toggleButton) {
          fireEvent.click(toggleButton);
          expect(mockSettingsStore.updateSettings).toHaveBeenCalledWith({ autoSave: false });
        }
      });
    });

    it('应该能够访问高级设置', async () => {
      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      
      const advancedTab = screen.getByText('高级设置');
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('性能设置')).toBeInTheDocument();
        expect(screen.getByText('数据管理')).toBeInTheDocument();
        expect(screen.getByText('导出设置')).toBeInTheDocument();
        expect(screen.getByText('重置所有设置')).toBeInTheDocument();
      });
    });
  });

  describe('设置存储集成', () => {
    it('应该在组件挂载时加载设置', () => {
      render(<ApiKeyConfig />);
      expect(mockSettingsStore.loadApiKey).toHaveBeenCalled();
    });

    it('应该在面板打开时加载设置', () => {
      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      expect(mockSettingsStore.loadSettings).toHaveBeenCalled();
    });

    it('应该处理加载错误', () => {
      const storeWithError = {
        ...mockSettingsStore,
        error: '加载设置失败'
      };
      (useSettingsStore as any).mockReturnValue(storeWithError);

      render(<SettingsPanel isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('加载设置失败')).toBeInTheDocument();
    });
  });
});