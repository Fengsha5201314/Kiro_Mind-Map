/**
 * 布局引擎服务
 * 负责计算不同布局模式下的节点位置
 */

import { MindMapNode } from '../types/mindmap';
import {
  LayoutMode,
  LayoutConfig,
  LayoutResult,
  NodePosition,
  DEFAULT_LAYOUT_CONFIG
} from '../types/layout';

/**
 * 布局引擎类
 */
export class LayoutEngine {
  private config: LayoutConfig;

  constructor(config?: Partial<LayoutConfig>) {
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  }

  /**
   * 计算布局
   * @param nodes 节点列表
   * @param mode 布局模式
   * @param config 可选的配置覆盖
   * @returns 布局结果
   */
  calculateLayout(
    nodes: MindMapNode[],
    mode: LayoutMode,
    config?: Partial<LayoutConfig>
  ): LayoutResult {
    // 合并配置
    const finalConfig = { ...this.config, ...config };

    // 根据布局模式调用相应的算法
    switch (mode) {
      case LayoutMode.HORIZONTAL_TREE:
        return this.calculateHorizontalTreeLayout(nodes, finalConfig);
      case LayoutMode.VERTICAL_TREE:
        return this.calculateVerticalTreeLayout(nodes, finalConfig);
      case LayoutMode.RADIAL:
        return this.calculateRadialLayout(nodes, finalConfig);
      case LayoutMode.FISHBONE:
        return this.calculateFishboneLayout(nodes, finalConfig);
      default:
        return this.calculateHorizontalTreeLayout(nodes, finalConfig);
    }
  }

  /**
   * 水平树形布局算法
   * 根节点在左侧，子节点向右展开
   */
  private calculateHorizontalTreeLayout(
    nodes: MindMapNode[],
    config: LayoutConfig
  ): LayoutResult {
    const positions = new Map<string, NodePosition>();
    const rootNodes = nodes.filter(n => n.level === 0);

    if (rootNodes.length === 0) {
      return this.createEmptyResult();
    }

    // 计算每个层级的节点
    const nodesByLevel = this.groupNodesByLevel(nodes);

    // 计算每个节点的子树高度
    const subtreeHeights = this.calculateSubtreeHeights(nodes, config);

    // 从根节点开始布局
    let currentY = config.padding;

    for (const rootNode of rootNodes) {
      const subtreeHeight = subtreeHeights.get(rootNode.id) || config.nodeHeight;
      const rootY = currentY + subtreeHeight / 2 - config.nodeHeight / 2;

      // 布局根节点
      positions.set(rootNode.id, {
        x: config.padding,
        y: rootY
      });

      // 递归布局子节点
      this.layoutHorizontalChildren(
        rootNode,
        nodes,
        positions,
        config,
        subtreeHeights,
        currentY
      );

      currentY += subtreeHeight + config.verticalSpacing;
    }

    return this.createLayoutResult(positions);
  }

  /**
   * 递归布局水平树形的子节点
   */
  private layoutHorizontalChildren(
    parentNode: MindMapNode,
    allNodes: MindMapNode[],
    positions: Map<string, NodePosition>,
    config: LayoutConfig,
    subtreeHeights: Map<string, number>,
    startY: number
  ): void {
    const children = allNodes.filter(n => n.parentId === parentNode.id && !n.collapsed);
    if (children.length === 0) return;

    const parentPos = positions.get(parentNode.id)!;
    const childX = parentPos.x + config.nodeWidth + config.levelSpacing;

    let currentY = startY;

    for (const child of children) {
      const childHeight = subtreeHeights.get(child.id) || config.nodeHeight;
      const childY = currentY + childHeight / 2 - config.nodeHeight / 2;

      positions.set(child.id, {
        x: childX,
        y: childY
      });

      // 递归布局子节点的子节点
      this.layoutHorizontalChildren(
        child,
        allNodes,
        positions,
        config,
        subtreeHeights,
        currentY
      );

      currentY += childHeight + config.verticalSpacing;
    }
  }

  /**
   * 垂直树形布局算法
   * 根节点在顶部，子节点向下展开
   */
  private calculateVerticalTreeLayout(
    nodes: MindMapNode[],
    config: LayoutConfig
  ): LayoutResult {
    const positions = new Map<string, NodePosition>();
    const rootNodes = nodes.filter(n => n.level === 0);

    if (rootNodes.length === 0) {
      return this.createEmptyResult();
    }

    // 计算每个节点的子树宽度
    const subtreeWidths = this.calculateSubtreeWidths(nodes, config);

    // 从根节点开始布局
    let currentX = config.padding;

    for (const rootNode of rootNodes) {
      const subtreeWidth = subtreeWidths.get(rootNode.id) || config.nodeWidth;
      const rootX = currentX + subtreeWidth / 2 - config.nodeWidth / 2;

      // 布局根节点
      positions.set(rootNode.id, {
        x: rootX,
        y: config.padding
      });

      // 递归布局子节点
      this.layoutVerticalChildren(
        rootNode,
        nodes,
        positions,
        config,
        subtreeWidths,
        currentX
      );

      currentX += subtreeWidth + config.horizontalSpacing;
    }

    return this.createLayoutResult(positions);
  }

  /**
   * 递归布局垂直树形的子节点
   */
  private layoutVerticalChildren(
    parentNode: MindMapNode,
    allNodes: MindMapNode[],
    positions: Map<string, NodePosition>,
    config: LayoutConfig,
    subtreeWidths: Map<string, number>,
    startX: number
  ): void {
    const children = allNodes.filter(n => n.parentId === parentNode.id && !n.collapsed);
    if (children.length === 0) return;

    const parentPos = positions.get(parentNode.id)!;
    const childY = parentPos.y + config.nodeHeight + config.levelSpacing;

    let currentX = startX;

    for (const child of children) {
      const childWidth = subtreeWidths.get(child.id) || config.nodeWidth;
      const childX = currentX + childWidth / 2 - config.nodeWidth / 2;

      positions.set(child.id, {
        x: childX,
        y: childY
      });

      // 递归布局子节点的子节点
      this.layoutVerticalChildren(
        child,
        allNodes,
        positions,
        config,
        subtreeWidths,
        currentX
      );

      currentX += childWidth + config.horizontalSpacing;
    }
  }

  /**
   * 辐射状布局算法
   * 根节点在中心，子节点环绕分布
   */
  private calculateRadialLayout(
    nodes: MindMapNode[],
    config: LayoutConfig
  ): LayoutResult {
    const positions = new Map<string, NodePosition>();
    const rootNodes = nodes.filter(n => n.level === 0);

    if (rootNodes.length === 0) {
      return this.createEmptyResult();
    }

    // 使用第一个根节点作为中心
    const rootNode = rootNodes[0];
    const centerX = config.canvasWidth / 2;
    const centerY = config.canvasHeight / 2;

    // 布局根节点在中心
    positions.set(rootNode.id, {
      x: centerX - config.nodeWidth / 2,
      y: centerY - config.nodeHeight / 2
    });

    // 递归布局子节点
    this.layoutRadialChildren(
      rootNode,
      nodes,
      positions,
      config,
      centerX,
      centerY,
      0,
      Math.PI * 2,
      1
    );

    return this.createLayoutResult(positions);
  }

  /**
   * 递归布局辐射状的子节点
   */
  private layoutRadialChildren(
    parentNode: MindMapNode,
    allNodes: MindMapNode[],
    positions: Map<string, NodePosition>,
    config: LayoutConfig,
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    level: number
  ): void {
    const children = allNodes.filter(n => n.parentId === parentNode.id && !n.collapsed);
    if (children.length === 0) return;

    const angleStep = (endAngle - startAngle) / children.length;
    const radius = (config.radialRadius || 150) * level;

    children.forEach((child, index) => {
      const angle = startAngle + angleStep * (index + 0.5);
      const x = centerX + radius * Math.cos(angle) - config.nodeWidth / 2;
      const y = centerY + radius * Math.sin(angle) - config.nodeHeight / 2;

      positions.set(child.id, { x, y });

      // 递归布局子节点
      const childStartAngle = startAngle + angleStep * index;
      const childEndAngle = startAngle + angleStep * (index + 1);
      
      this.layoutRadialChildren(
        child,
        allNodes,
        positions,
        config,
        centerX,
        centerY,
        childStartAngle,
        childEndAngle,
        level + 1
      );
    });
  }

  /**
   * 鱼骨图布局算法
   * 主题在右侧，分支向左展开
   */
  private calculateFishboneLayout(
    nodes: MindMapNode[],
    config: LayoutConfig
  ): LayoutResult {
    const positions = new Map<string, NodePosition>();
    const rootNodes = nodes.filter(n => n.level === 0);

    if (rootNodes.length === 0) {
      return this.createEmptyResult();
    }

    // 使用第一个根节点作为主题（鱼头）
    const rootNode = rootNodes[0];
    const headX = config.canvasWidth - config.padding - config.nodeWidth;
    const headY = config.canvasHeight / 2 - config.nodeHeight / 2;

    // 布局根节点（鱼头）
    positions.set(rootNode.id, {
      x: headX,
      y: headY
    });

    // 获取第一层子节点（主要分支）
    const mainBranches = nodes.filter(n => n.parentId === rootNode.id && !n.collapsed);
    
    // 将主要分支分为上下两组
    const topBranches = mainBranches.filter((_, index) => index % 2 === 0);
    const bottomBranches = mainBranches.filter((_, index) => index % 2 === 1);

    // 布局上方分支
    this.layoutFishboneBranches(
      topBranches,
      nodes,
      positions,
      config,
      headX,
      headY,
      -1 // 向上
    );

    // 布局下方分支
    this.layoutFishboneBranches(
      bottomBranches,
      nodes,
      positions,
      config,
      headX,
      headY,
      1 // 向下
    );

    return this.createLayoutResult(positions);
  }

  /**
   * 布局鱼骨图的分支
   */
  private layoutFishboneBranches(
    branches: MindMapNode[],
    allNodes: MindMapNode[],
    positions: Map<string, NodePosition>,
    config: LayoutConfig,
    headX: number,
    headY: number,
    direction: number // -1 for top, 1 for bottom
  ): void {
    const angle = (config.fishboneAngle || 30) * (Math.PI / 180);
    const branchSpacing = config.levelSpacing;

    branches.forEach((branch, index) => {
      const offsetX = branchSpacing * (index + 1);
      const offsetY = direction * Math.tan(angle) * offsetX;

      const branchX = headX - offsetX;
      const branchY = headY + offsetY;

      positions.set(branch.id, {
        x: branchX,
        y: branchY
      });

      // 布局子分支（垂直排列）
      const subBranches = allNodes.filter(n => n.parentId === branch.id && !n.collapsed);
      subBranches.forEach((subBranch, subIndex) => {
        const subX = branchX - config.nodeWidth - config.horizontalSpacing;
        const subY = branchY + direction * (subIndex * (config.nodeHeight + config.verticalSpacing));

        positions.set(subBranch.id, {
          x: subX,
          y: subY
        });
      });
    });
  }

  /**
   * 计算子树高度
   */
  private calculateSubtreeHeights(
    nodes: MindMapNode[],
    config: LayoutConfig
  ): Map<string, number> {
    const heights = new Map<string, number>();

    const calculateHeight = (node: MindMapNode): number => {
      const children = nodes.filter(n => n.parentId === node.id && !n.collapsed);
      
      if (children.length === 0) {
        const height = config.nodeHeight;
        heights.set(node.id, height);
        return height;
      }

      const childrenHeight = children.reduce((sum, child) => {
        return sum + calculateHeight(child);
      }, 0);

      const totalHeight = childrenHeight + (children.length - 1) * config.verticalSpacing;
      heights.set(node.id, totalHeight);
      return totalHeight;
    };

    nodes.filter(n => n.level === 0).forEach(root => calculateHeight(root));
    return heights;
  }

  /**
   * 计算子树宽度
   */
  private calculateSubtreeWidths(
    nodes: MindMapNode[],
    config: LayoutConfig
  ): Map<string, number> {
    const widths = new Map<string, number>();

    const calculateWidth = (node: MindMapNode): number => {
      const children = nodes.filter(n => n.parentId === node.id && !n.collapsed);
      
      if (children.length === 0) {
        const width = config.nodeWidth;
        widths.set(node.id, width);
        return width;
      }

      const childrenWidth = children.reduce((sum, child) => {
        return sum + calculateWidth(child);
      }, 0);

      const totalWidth = childrenWidth + (children.length - 1) * config.horizontalSpacing;
      widths.set(node.id, totalWidth);
      return totalWidth;
    };

    nodes.filter(n => n.level === 0).forEach(root => calculateWidth(root));
    return widths;
  }

  /**
   * 按层级分组节点
   */
  private groupNodesByLevel(nodes: MindMapNode[]): Map<number, MindMapNode[]> {
    const groups = new Map<number, MindMapNode[]>();
    
    nodes.forEach(node => {
      if (!groups.has(node.level)) {
        groups.set(node.level, []);
      }
      groups.get(node.level)!.push(node);
    });

    return groups;
  }

  /**
   * 创建布局结果
   */
  private createLayoutResult(positions: Map<string, NodePosition>): LayoutResult {
    if (positions.size === 0) {
      return this.createEmptyResult();
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + this.config.nodeWidth);
      maxY = Math.max(maxY, pos.y + this.config.nodeHeight);
    });

    return {
      positions,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
      }
    };
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(): LayoutResult {
    return {
      positions: new Map(),
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0
      }
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出服务实例
export const layoutEngine = new LayoutEngine();
