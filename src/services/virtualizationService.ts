/**
 * 虚拟化渲染服务
 * 为大型思维导图实现视口裁剪和节点懒加载，提升渲染性能
 */

import { MindMapNode } from '../types/mindmap';

// 视口信息接口
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

// 节点边界框接口
export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 虚拟化配置
export interface VirtualizationConfig {
  // 启用虚拟化的最小节点数阈值
  minNodesForVirtualization: number;
  // 视口外扩展区域（像素）
  viewportPadding: number;
  // 节点默认尺寸
  defaultNodeWidth: number;
  defaultNodeHeight: number;
  // 懒加载配置
  lazyLoadingEnabled: boolean;
  // 折叠节点的子节点是否参与虚拟化计算
  includeCollapsedChildren: boolean;
}

// 默认配置
const DEFAULT_CONFIG: VirtualizationConfig = {
  minNodesForVirtualization: 100,
  viewportPadding: 200,
  defaultNodeWidth: 200,
  defaultNodeHeight: 60,
  lazyLoadingEnabled: true,
  includeCollapsedChildren: false
};

// 虚拟化结果
export interface VirtualizationResult {
  // 需要渲染的节点
  visibleNodes: MindMapNode[];
  // 总节点数
  totalNodes: number;
  // 是否启用了虚拟化
  virtualizationEnabled: boolean;
  // 性能统计
  stats: {
    filteredNodes: number;
    renderTime: number;
  };
}

/**
 * 虚拟化渲染服务类
 */
export class VirtualizationService {
  private config: VirtualizationConfig;

  constructor(config: Partial<VirtualizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<VirtualizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 计算节点的边界框
   */
  private calculateNodeBounds(node: MindMapNode): NodeBounds {
    const position = node.position || { x: 0, y: 0 };
    return {
      x: position.x - this.config.defaultNodeWidth / 2,
      y: position.y - this.config.defaultNodeHeight / 2,
      width: this.config.defaultNodeWidth,
      height: this.config.defaultNodeHeight
    };
  }

  /**
   * 检查节点是否在视口内（包含扩展区域）
   */
  private isNodeInViewport(nodeBounds: NodeBounds, viewport: Viewport): boolean {
    const expandedViewport = {
      x: viewport.x - this.config.viewportPadding,
      y: viewport.y - this.config.viewportPadding,
      width: viewport.width + this.config.viewportPadding * 2,
      height: viewport.height + this.config.viewportPadding * 2
    };

    return !(
      nodeBounds.x + nodeBounds.width < expandedViewport.x ||
      nodeBounds.x > expandedViewport.x + expandedViewport.width ||
      nodeBounds.y + nodeBounds.height < expandedViewport.y ||
      nodeBounds.y > expandedViewport.y + expandedViewport.height
    );
  }

  /**
   * 获取节点的所有可见子节点（考虑折叠状态）
   */
  private _getVisibleChildren(
    node: MindMapNode, 
    allNodes: MindMapNode[]
  ): MindMapNode[] {
    if (node.collapsed && !this.config.includeCollapsedChildren) {
      return [];
    }

    const children: MindMapNode[] = [];
    const childNodes = allNodes.filter(n => n.parentId === node.id);
    
    for (const child of childNodes) {
      children.push(child);
      // 递归获取子节点的子节点
      children.push(...this._getVisibleChildren(child, allNodes));
    }

    return children;
  }

  /**
   * 过滤需要渲染的节点
   */
  private filterVisibleNodes(
    nodes: MindMapNode[], 
    viewport: Viewport
  ): MindMapNode[] {
    const startTime = performance.now();
    const visibleNodes: MindMapNode[] = [];
    const processedNodes = new Set<string>();

    // 首先处理根节点
    const rootNodes = nodes.filter(node => node.level === 0);
    
    for (const rootNode of rootNodes) {
      // const _rootBounds = this.calculateNodeBounds(rootNode);
      
      // 根节点总是包含（即使不在视口内，也需要保持结构完整性）
      if (!processedNodes.has(rootNode.id)) {
        visibleNodes.push(rootNode);
        processedNodes.add(rootNode.id);
      }

      // 递归处理子节点
      this.processNodeHierarchy(
        rootNode, 
        nodes, 
        viewport, 
        visibleNodes, 
        processedNodes
      );
    }

    const renderTime = performance.now() - startTime;
    console.log(`虚拟化过滤耗时: ${renderTime.toFixed(2)}ms`);

    return visibleNodes;
  }

  /**
   * 递归处理节点层次结构
   */
  private processNodeHierarchy(
    parentNode: MindMapNode,
    allNodes: MindMapNode[],
    viewport: Viewport,
    visibleNodes: MindMapNode[],
    processedNodes: Set<string>
  ): void {
    // 如果父节点折叠，跳过子节点处理
    if (parentNode.collapsed && !this.config.includeCollapsedChildren) {
      return;
    }

    const childNodes = allNodes.filter(node => node.parentId === parentNode.id);
    
    for (const childNode of childNodes) {
      if (processedNodes.has(childNode.id)) {
        continue;
      }

      const childBounds = this.calculateNodeBounds(childNode);
      
      // 检查子节点是否在视口内
      if (this.isNodeInViewport(childBounds, viewport)) {
        visibleNodes.push(childNode);
        processedNodes.add(childNode.id);
        
        // 递归处理子节点的子节点
        this.processNodeHierarchy(
          childNode, 
          allNodes, 
          viewport, 
          visibleNodes, 
          processedNodes
        );
      } else {
        // 即使节点不在视口内，也要检查其子节点是否可能在视口内
        // 这对于大型分支很重要
        const hasVisibleDescendants = this.hasVisibleDescendants(
          childNode, 
          allNodes, 
          viewport
        );
        
        if (hasVisibleDescendants) {
          visibleNodes.push(childNode);
          processedNodes.add(childNode.id);
          
          this.processNodeHierarchy(
            childNode, 
            allNodes, 
            viewport, 
            visibleNodes, 
            processedNodes
          );
        }
      }
    }
  }

  /**
   * 检查节点是否有可见的后代节点
   */
  private hasVisibleDescendants(
    node: MindMapNode,
    allNodes: MindMapNode[],
    viewport: Viewport
  ): boolean {
    if (node.collapsed && !this.config.includeCollapsedChildren) {
      return false;
    }

    const childNodes = allNodes.filter(n => n.parentId === node.id);
    
    for (const child of childNodes) {
      const childBounds = this.calculateNodeBounds(child);
      
      if (this.isNodeInViewport(childBounds, viewport)) {
        return true;
      }
      
      // 递归检查子节点的后代
      if (this.hasVisibleDescendants(child, allNodes, viewport)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 执行虚拟化渲染
   */
  virtualize(
    nodes: MindMapNode[], 
    viewport: Viewport
  ): VirtualizationResult {
    const startTime = performance.now();
    
    // 检查是否需要启用虚拟化
    const shouldVirtualize = nodes.length >= this.config.minNodesForVirtualization;
    
    let visibleNodes: MindMapNode[];
    let filteredCount = 0;
    
    if (shouldVirtualize) {
      visibleNodes = this.filterVisibleNodes(nodes, viewport);
      filteredCount = nodes.length - visibleNodes.length;
    } else {
      // 节点数量较少时，直接返回所有节点
      visibleNodes = [...nodes];
    }
    
    const renderTime = performance.now() - startTime;
    
    return {
      visibleNodes,
      totalNodes: nodes.length,
      virtualizationEnabled: shouldVirtualize,
      stats: {
        filteredNodes: filteredCount,
        renderTime
      }
    };
  }

  /**
   * 计算视口信息（从ReactFlow实例获取）
   */
  calculateViewport(
    transform: [number, number, number], // [x, y, zoom]
    dimensions: { width: number; height: number }
  ): Viewport {
    const [x, y, zoom] = transform;
    
    return {
      x: -x / zoom,
      y: -y / zoom,
      width: dimensions.width / zoom,
      height: dimensions.height / zoom,
      zoom
    };
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats(result: VirtualizationResult): string {
    const { stats, totalNodes, visibleNodes, virtualizationEnabled } = result;
    
    if (!virtualizationEnabled) {
      return `渲染 ${totalNodes} 个节点 (虚拟化未启用)`;
    }
    
    const filterRatio = ((stats.filteredNodes / totalNodes) * 100).toFixed(1);
    
    return [
      `虚拟化渲染统计:`,
      `- 总节点数: ${totalNodes}`,
      `- 可见节点: ${visibleNodes.length}`,
      `- 过滤节点: ${stats.filteredNodes} (${filterRatio}%)`,
      `- 渲染耗时: ${stats.renderTime.toFixed(2)}ms`
    ].join('\n');
  }
}

// 导出默认实例
export const virtualizationService = new VirtualizationService();

export default VirtualizationService;