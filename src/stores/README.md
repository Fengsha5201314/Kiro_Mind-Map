# 状态管理 Store

本项目使用 [Zustand](https://github.com/pmndrs/zustand) 作为状态管理库，提供了三个主要的Store来管理应用状态。

## Store 概览

### 1. MindMap Store (`mindmapStore.ts`)
管理思维导图的状态和操作，包括节点的增删改查、视图状态等。

### 2. Settings Store (`settingsStore.ts`)
管理应用设置，包括API密钥、主题、语言等配置。

### 3. History Store (`historyStore.ts`)
管理思维导图的历史记录，包括搜索、分页、排序等功能。

## 使用方法

### 基本导入

```typescript
import { useMindMapStore, useSettingsStore, useHistoryStore } from '../stores';
```

### MindMap Store 使用示例

```typescript
// 在React组件中使用
function MindMapComponent() {
  const { 
    currentMindMap, 
    isLoading, 
    setMindMap, 
    addNode, 
    updateNode, 
    deleteNode 
  } = useMindMapStore();

  // 设置思维导图
  const handleSetMindMap = (data: MindMapData) => {
    setMindMap(data);
  };

  // 添加节点
  const handleAddNode = (parentId: string) => {
    addNode(parentId, '新节点');
  };

  // 更新节点
  const handleUpdateNode = (nodeId: string, content: string) => {
    updateNode(nodeId, { content });
  };

  return (
    <div>
      {isLoading && <div>加载中...</div>}
      {currentMindMap && (
        <div>
          <h2>{currentMindMap.title}</h2>
          <p>节点数量: {currentMindMap.nodes.length}</p>
        </div>
      )}
    </div>
  );
}
```

### Settings Store 使用示例

```typescript
function SettingsComponent() {
  const { 
    apiKey, 
    settings, 
    setApiKey, 
    updateSettings, 
    setTheme 
  } = useSettingsStore();

  // 设置API密钥
  const handleSetApiKey = async (key: string) => {
    try {
      await setApiKey(key);
      console.log('API密钥设置成功');
    } catch (error) {
      console.error('API密钥设置失败:', error);
    }
  };

  // 切换主题
  const handleToggleTheme = async () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  return (
    <div>
      <div>当前主题: {settings.theme}</div>
      <button onClick={handleToggleTheme}>切换主题</button>
      {apiKey ? (
        <div>API密钥已配置</div>
      ) : (
        <div>请配置API密钥</div>
      )}
    </div>
  );
}
```

### History Store 使用示例

```typescript
function HistoryComponent() {
  const { 
    filteredMindMaps, 
    searchQuery, 
    pagination,
    setSearchQuery, 
    loadHistory,
    removeFromHistory 
  } = useHistoryStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 搜索历史记录
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 删除历史记录
  const handleDelete = async (id: string) => {
    try {
      await removeFromHistory(id);
      console.log('删除成功');
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div>
      <input 
        type="text" 
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="搜索历史记录..."
      />
      
      <div>
        {filteredMindMaps.map(item => (
          <div key={item.id}>
            <h3>{item.title}</h3>
            <p>节点数: {item.nodeCount}</p>
            <p>更新时间: {new Date(item.updatedAt).toLocaleString()}</p>
            <button onClick={() => handleDelete(item.id)}>删除</button>
          </div>
        ))}
      </div>
      
      <div>
        第 {pagination.currentPage} 页，共 {pagination.totalPages} 页
      </div>
    </div>
  );
}
```

## Store 初始化

在应用启动时，需要初始化Store：

```typescript
import { initializeStores } from '../stores';

// 在应用入口处调用
async function initApp() {
  try {
    await initializeStores();
    console.log('Store初始化完成');
  } catch (error) {
    console.error('Store初始化失败:', error);
  }
}
```

## 状态订阅

Zustand 支持选择性订阅状态变化：

```typescript
// 只订阅特定状态
function MyComponent() {
  const currentMindMap = useMindMapStore(state => state.currentMindMap);
  const isLoading = useMindMapStore(state => state.isLoading);
  
  // 组件只会在 currentMindMap 或 isLoading 变化时重新渲染
  return (
    <div>
      {isLoading ? '加载中...' : currentMindMap?.title}
    </div>
  );
}
```

## 在Store外部使用

有时需要在React组件外部访问Store：

```typescript
import { useMindMapStore } from '../stores/mindmapStore';

// 获取当前状态
const currentState = useMindMapStore.getState();

// 调用方法
currentState.addNode('parent-id', '新节点');

// 订阅状态变化
const unsubscribe = useMindMapStore.subscribe(
  (state) => state.currentMindMap,
  (mindMap) => {
    console.log('思维导图变化:', mindMap?.title);
  }
);

// 取消订阅
unsubscribe();
```

## 错误处理

所有Store都包含错误状态管理：

```typescript
function ErrorHandlingComponent() {
  const { error, setError } = useMindMapStore();
  
  useEffect(() => {
    if (error) {
      console.error('MindMap Store错误:', error);
      // 显示错误提示
      alert(error);
      // 清除错误
      setError(null);
    }
  }, [error, setError]);
  
  return <div>{/* 组件内容 */}</div>;
}
```

## 性能优化建议

1. **选择性订阅**: 只订阅组件需要的状态片段
2. **避免频繁更新**: 使用防抖或节流来限制高频操作
3. **批量更新**: 将多个相关的状态更新合并为一次操作
4. **懒加载**: 大型数据集使用分页或虚拟化

## 测试

Store包含完整的测试覆盖，参见 `src/test/stores.test.ts`：

```bash
# 运行Store测试
npm test src/test/stores.test.ts
```

## 类型安全

所有Store都提供完整的TypeScript类型支持：

```typescript
// 类型会自动推断
const mindMap = useMindMapStore(state => state.currentMindMap); // MindMapData | null
const settings = useSettingsStore(state => state.settings); // Settings
const history = useHistoryStore(state => state.mindMaps); // HistoryItem[]
```

## 扩展Store

如需添加新的状态或方法，请遵循现有的模式：

```typescript
// 在Store接口中添加新方法
interface MindMapStore {
  // 现有方法...
  newMethod: (param: string) => void;
}

// 在create函数中实现
export const useMindMapStore = create<MindMapStore>((set, get) => ({
  // 现有实现...
  newMethod: (param: string) => {
    // 实现逻辑
    set({ /* 更新状态 */ });
  }
}));
```