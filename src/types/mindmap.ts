/**
 * 思维导图相关类型定义
 */

// 节点样式配置
export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  borderWidth?: number;
  borderRadius?: number;
}

// 思维导图节点
export interface MindMapNode {
  id: string;                    // 节点唯一标识
  content: string;               // 节点内容文本
  level: number;                 // 节点层级（0为根节点）
  parentId: string | null;       // 父节点ID，根节点为null
  children: string[];            // 子节点ID列表
  position?: { x: number; y: number }; // 节点在画布上的位置
  style?: NodeStyle;             // 节点样式配置
  collapsed?: boolean;           // 是否折叠子节点
  createdAt?: number;           // 创建时间戳
  updatedAt?: number;           // 更新时间戳
}

// 思维导图数据结构
export interface MindMapData {
  id: string;                    // 思维导图唯一标识
  title: string;                 // 思维导图标题
  nodes: MindMapNode[];          // 所有节点列表
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
  metadata?: {                   // 元数据
    sourceType?: 'file' | 'text' | 'topic'; // 来源类型
    sourceFileName?: string;      // 源文件名
    sourceFileSize?: number;      // 源文件大小
    aiModel?: string;            // 使用的AI模型
    processingTime?: number;     // 处理耗时（毫秒）
  };
}

// AI生成的思维导图结构（用于API响应解析）
export interface MindMapStructure {
  title: string;                 // 思维导图标题
  nodes: Array<{
    content: string;             // 节点内容
    level: number;               // 节点层级
    children?: MindMapStructure['nodes']; // 子节点（递归结构）
  }>;
}

// 思维导图导出格式
export type ExportFormat = 'png' | 'json' | 'markdown' | 'svg';

// 思维导图操作类型
export type MindMapOperation = 
  | 'add_node'
  | 'delete_node' 
  | 'edit_node'
  | 'move_node'
  | 'toggle_collapse'
  | 'update_style';

// 思维导图操作历史记录
export interface MindMapAction {
  id: string;
  type: MindMapOperation;
  timestamp: number;
  nodeId?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

// 思维导图视图状态
export interface ViewState {
  zoom: number;                  // 缩放级别
  centerX: number;               // 视图中心X坐标
  centerY: number;               // 视图中心Y坐标
  selectedNodeId?: string;       // 当前选中的节点ID
  editingNodeId?: string;        // 当前编辑的节点ID
}

// 思维导图配置选项
export interface MindMapConfig {
  maxNodes: number;              // 最大节点数限制
  maxDepth: number;              // 最大层级深度
  autoLayout: boolean;           // 是否自动布局
  showMinimap: boolean;          // 是否显示小地图
  enableAnimation: boolean;      // 是否启用动画
  theme: 'light' | 'dark';       // 主题模式
}