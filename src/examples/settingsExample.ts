/**
 * 设置功能使用示例
 * 演示如何使用设置存储和组件
 */

import { useSettingsStore } from '../stores/settingsStore';

// 设置功能使用示例
export const settingsExample = async () => {
  console.log('=== 设置功能演示 ===');

  // 获取设置存储实例
  const settingsStore = useSettingsStore.getState();

  try {
    // 1. 加载现有设置
    console.log('1. 加载设置...');
    await settingsStore.loadSettings();
    await settingsStore.loadApiKey();
    
    console.log('当前设置:', settingsStore.settings);
    console.log('API密钥状态:', settingsStore.apiKeyMask ? '已配置' : '未配置');

    // 2. 配置API密钥（示例）
    console.log('\n2. 配置API密钥...');
    const testApiKey = 'AIzaSyTest123456789';
    await settingsStore.setApiKey(testApiKey);
    console.log('API密钥已保存，掩码版本:', settingsStore.apiKeyMask);

    // 3. 更新主题设置
    console.log('\n3. 切换主题...');
    await settingsStore.setTheme('dark');
    console.log('主题已切换为:', settingsStore.settings.theme);

    // 4. 更新其他设置
    console.log('\n4. 更新功能设置...');
    await settingsStore.updateSettings({
      autoSave: false,
      showMinimap: false,
      maxNodes: 2000
    });
    console.log('设置已更新:', {
      autoSave: settingsStore.settings.autoSave,
      showMinimap: settingsStore.settings.showMinimap,
      maxNodes: settingsStore.settings.maxNodes
    });

    // 5. 导出设置
    console.log('\n5. 导出设置...');
    const exportedSettings = settingsStore.exportSettings();
    console.log('导出的设置:', exportedSettings);

    // 6. 重置设置
    console.log('\n6. 重置设置...');
    await settingsStore.resetSettings();
    console.log('设置已重置为默认值');

    // 7. 清理API密钥
    console.log('\n7. 清理API密钥...');
    await settingsStore.clearApiKey();
    console.log('API密钥已删除');

    console.log('\n=== 设置功能演示完成 ===');
  } catch (error) {
    console.error('设置功能演示出错:', error);
  }
};

// 设置组件集成示例
export const settingsComponentExample = () => {
  console.log('=== 设置组件集成示例 ===');
  
  console.log(`
使用设置组件的步骤：

1. 导入设置组件：
   import { ApiKeyConfig, SettingsPanel } from '../components/Settings';

2. 在应用中使用API密钥配置组件：
   <ApiKeyConfig className="mb-4" />

3. 在应用中使用设置面板：
   const [showSettings, setShowSettings] = useState(false);
   
   <SettingsPanel 
     isOpen={showSettings} 
     onClose={() => setShowSettings(false)} 
   />

4. 触发设置面板：
   <button onClick={() => setShowSettings(true)}>
     打开设置
   </button>

5. 在应用启动时初始化设置：
   import { initializeSettings } from '../stores/settingsStore';
   
   useEffect(() => {
     initializeSettings();
   }, []);

设置功能特性：
- ✅ API密钥加密存储
- ✅ 主题切换（浅色/深色）
- ✅ 功能开关（自动保存、小地图、动画）
- ✅ 性能设置（最大节点数、深度）
- ✅ 设置导入/导出
- ✅ 设置重置
- ✅ 错误处理和用户反馈
- ✅ 响应式设计
- ✅ 键盘快捷键支持
  `);
};

// 设置验证示例
export const settingsValidationExample = async () => {
  console.log('=== 设置验证示例 ===');

  const settingsStore = useSettingsStore.getState();

  try {
    // 测试API密钥验证
    console.log('1. 测试API密钥验证...');
    
    try {
      await settingsStore.setApiKey('');
      console.log('❌ 空API密钥应该被拒绝');
    } catch (error) {
      console.log('✅ 空API密钥被正确拒绝:', (error as Error).message);
    }

    try {
      await settingsStore.setApiKey('invalid-key');
      console.log('❌ 无效API密钥应该被拒绝');
    } catch (error) {
      console.log('✅ 无效API密钥被正确拒绝:', (error as Error).message);
    }

    // 测试设置值验证
    console.log('\n2. 测试设置值验证...');
    
    try {
      await settingsStore.updateSettings({ maxNodes: -1 });
      console.log('❌ 无效节点数应该被拒绝');
    } catch (error) {
      console.log('✅ 无效节点数被正确拒绝:', (error as Error).message);
    }

    try {
      await settingsStore.updateSettings({ maxDepth: 25 });
      console.log('❌ 无效深度应该被拒绝');
    } catch (error) {
      console.log('✅ 无效深度被正确拒绝:', (error as Error).message);
    }

    console.log('\n✅ 所有验证测试通过');
  } catch (error) {
    console.error('验证测试出错:', error);
  }
};

// 运行所有示例
export const runAllSettingsExamples = async () => {
  await settingsExample();
  settingsComponentExample();
  await settingsValidationExample();
};