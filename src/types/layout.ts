/**
 * 布局相关类型定义
 */

// 布局模式枚举
export enum LayoutMode {
  HORIZONTAL_TREE = 'horizontal_tree',   // 水平树形布局（默认）
  VERTICAL_TREE = 'vertical_tree',       // 垂直树形布局
  RADIAL = 'radial',                     // 辐射状布局
  FISHBONE = 'fishbone'                  // 鱼骨图布局
}

// 布局模式显示名称
export const LAYOUT_MODE_LABELS: Record<LayoutMode, string> = {
  [LayoutMode.HORIZONTAL_TREE]: '水平树形',
  [LayoutMode.VERTICAL_TREE]: '垂直树形',
  [LayoutMode.RADIAL]: '辐射状',
  [LayoutMode.FISHBONE]: '鱼骨图'
};

// 布局模式描述
export const LAYOUT_MODE_DESCRIPTIONS: Record<LayoutMode, string> = {
  [LayoutMode.HORIZONTAL_TREE]: '根节点在左侧，子节点向右展开',
  [LayoutMode.VERTICAL_TREE]: '根节点在顶部，子节点向下展开',
  [LayoutMode.RADIAL]: '根节点在中心，子节点环绕分布',
  [LayoutMode.FISHBONE]: '主题在右侧，分支向左展开'
};

// 布局模式适用场景
export const LAYOUT_MODE_USE_CASES: Record<LayoutMode, string> = {
  [LayoutMode.HORIZONTAL_TREE]: '适用于大多数场景，层次清晰',
  [LayoutMode.VERTICAL_TREE]: '适用于组织架构图、流程图',
  [LayoutMode.RADIAL]: '适用于头脑风暴、概念关联',
  [LayoutMode.FISHBONE]: '适用于因果分析、问题诊断'
};

// 节点位置
export interface NodePosition {
  x: number;
  y: number;
}

// 布局配置
export interface LayoutConfig {
  // 节点尺寸
  nodeWidth: number;
  nodeHeight: number;
  
  // 间距
  horizontalSpacing: number;  // 水平间距
  verticalSpacing: number;    // 垂直间距
  levelSpacing: number;       // 层级间距
  
  // 画布配置
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
  
  // 特殊配置
  radialRadius?: number;      // 辐射状布局的半径
  fishboneAngle?: number;     // 鱼骨图的分支角度
}

// 默认布局配置
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 180,
  nodeHeight: 60,
  horizontalSpacing: 80,
  verticalSpacing: 40,
  levelSpacing: 200,
  canvasWidth: 2000,
  canvasHeight: 2000,
  padding: 100,
  radialRadius: 150,
  fishboneAngle: 30
};

// 布局结果
export interface LayoutResult {
  positions: Map<string, NodePosition>;  // 节点ID到位置的映射
  bounds: {                              // 布局边界
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}
