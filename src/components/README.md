# UI组件文档

本目录包含AI思维导图生成器的所有UI组件。

## 布局组件 (Layout)

### Layout
主布局容器组件，提供整体页面结构。

**功能特性：**
- 集成Header和Sidebar组件
- 管理侧边栏开关状态
- 处理思维导图选择和删除事件

### Header
顶部导航栏组件。

**功能特性：**
- 显示应用标题
- 提供新建、导出、历史记录、设置按钮
- 响应式设计

### Sidebar
历史记录侧边栏组件。

**功能特性：**
- 显示历史思维导图列表
- 支持选择和删除操作
- 中文日期格式化
- 响应式侧边栏（移动端遮罩层）

## 通用组件 (Common)

### Button
通用按钮组件。

**变体类型：**
- `primary` - 主要按钮（蓝色）
- `secondary` - 次要按钮（灰色）
- `outline` - 边框按钮
- `ghost` - 幽灵按钮
- `danger` - 危险按钮（红色）

**尺寸：**
- `sm` - 小尺寸
- `md` - 中等尺寸（默认）
- `lg` - 大尺寸

**功能特性：**
- 加载状态支持
- 图标支持
- 完全可定制样式

### Modal
模态对话框组件。

**功能特性：**
- ESC键关闭
- 点击遮罩层关闭（可配置）
- 多种尺寸选项
- 自定义头部和底部
- 防止背景滚动

### Loading
加载动画组件。

**变体：**
- `Loading` - 基础加载组件
- `InlineLoading` - 内联加载（用于按钮等）
- `PageLoading` - 页面级加载

**功能特性：**
- 多种尺寸
- 可选文本说明
- 遮罩层模式

### Toast
提示消息组件。

**消息类型：**
- `success` - 成功消息（绿色）
- `error` - 错误消息（红色）
- `warning` - 警告消息（黄色）
- `info` - 信息消息（蓝色）

**功能特性：**
- 自动关闭（可配置）
- 手动关闭按钮
- 进入/退出动画
- 多位置支持

## 使用示例

```tsx
import { Layout, Button, Modal, Loading, ToastContainer } from './components';

// 基础布局
<Layout
  mindMaps={mindMaps}
  onMindMapSelect={handleSelect}
  onMindMapDelete={handleDelete}
>
  <div>主要内容</div>
</Layout>

// 按钮使用
<Button variant="primary" size="lg" loading={isLoading}>
  保存
</Button>

// 模态框
<Modal isOpen={showModal} onClose={closeModal} title="设置">
  <div>模态框内容</div>
</Modal>

// 加载状态
<Loading text="正在生成思维导图..." />

// Toast容器
<ToastContainer toasts={toasts} onClose={removeToast} />
```

## 样式系统

所有组件使用Tailwind CSS构建，遵循以下设计原则：

- **一致性**: 统一的颜色、间距、字体系统
- **响应式**: 支持移动端和桌面端
- **可访问性**: 符合WCAG标准
- **中文优化**: 针对中文界面优化的字体和间距

## 图标系统

使用 `lucide-react` 图标库，提供一致的图标风格。

常用图标：
- `Settings` - 设置
- `FileText` - 文件/历史记录
- `Download` - 下载/导出
- `Plus` - 新建/添加
- `X` - 关闭
- `Loader2` - 加载动画