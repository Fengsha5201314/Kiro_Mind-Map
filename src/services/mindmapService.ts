/**
 * 思维导图服务
 * 负责思维导图的业务逻辑处理，包括数据转换、节点管理等
 */

import { 
  MindMapData, 
  MindMapNode, 
  MindMapStructure, 
  NodeStyle
} from '../types/mindmap';
import { geminiService } from './geminiService';
import { generateSecureId } from '../utils/crypto';
import { errorHandler } from './errorHandler';

/**
 * 思维导图服务类
 */
export class MindMapService {
  
  /**
   * 从内容生成思维导图
   * @param content 输入内容
   * @param apiKey API密钥
   * @param sourceType 来源类型
   * @param sourceFileName 源文件名（可选）
   * @returns 完整的思维导图数据
   */
  async generateFromContent(
    content: string, 
    apiKey: string, 
    sourceType: 'file' | 'text' = 'text',
    sourceFileName?: string
  ): Promise<MindMapData> {
    const startTime = Date.now();
    
    try {
      // 使用错误处理器执行生成操作
      const structure = await errorHandler.executeWithRetry(async () => {
        return await geminiService.generateMindMap(content, apiKey);
      });
      
      // 转换为完整的思维导图数据
      const mindMapData = this.convertStructureToMindMapData(structure, {
        sourceType,
        sourceFileName,
        aiModel: 'gemini-pro',
        processingTime: Date.now() - startTime
      });
      
      return mindMapData;
    } catch (error) {
      const errorResult = errorHandler.handleError(error);
      throw new Error(errorResult.userMessage);
    }
  }

  /**
   * 从主题生成思维导图
   * @param topic 主题文本
   * @param apiKey API密钥
   * @returns 完整的思维导图数据
   */
  async generateFromTopic(topic: string, apiKey: string): Promise<MindMapData> {
    const startTime = Date.now();
    
    try {
      // 使用错误处理器执行生成操作
      const structure = await errorHandler.executeWithRetry(async () => {
        return await geminiService.generateFromTopic(topic, apiKey);
      });
      
      // 转换为完整的思维导图数据
      const mindMapData = this.convertStructureToMindMapData(structure, {
        sourceType: 'topic',
        aiModel: 'gemini-pro',
        processingTime: Date.now() - startTime
      });
      
      return mindMapData;
    } catch (error) {
      const errorResult = errorHandler.handleError(error);
      throw new Error(errorResult.userMessage);
    }
  }

  /**
   * 将AI生成的结构转换为完整的思维导图数据（公共方法）
   * @param structure AI生成的思维导图结构
   * @param metadata 元数据（可选）
   * @returns 完整的思维导图数据
   */
  convertStructureToMindMap(
    structure: MindMapStructure, 
    metadata?: Partial<MindMapData['metadata']>
  ): MindMapData {
    return this.convertStructureToMindMapData(structure, {
      sourceType: 'text',
      aiModel: 'gemini-pro',
      processingTime: 0,
      ...metadata
    });
  }

  /**
   * 将AI生成的结构转换为完整的思维导图数据
   * @param structure AI生成的思维导图结构
   * @param metadata 元数据
   * @returns 完整的思维导图数据
   */
  private convertStructureToMindMapData(
    structure: MindMapStructure, 
    metadata: MindMapData['metadata']
  ): MindMapData {
    const now = Date.now();
    const mindMapId = generateSecureId();
    const nodes: MindMapNode[] = [];
    
    // 递归转换节点结构
    this.convertNodesToFlat(structure.nodes, nodes, null);
    
    // 为节点分配位置
    this.assignNodePositions(nodes);
    
    return {
      id: mindMapId,
      title: structure.title || '未命名思维导图',
      nodes,
      createdAt: now,
      updatedAt: now,
      metadata
    };
  }

  /**
   * 递归将嵌套的节点结构转换为扁平的节点数组
   * @param structureNodes 结构化节点数组
   * @param flatNodes 扁平节点数组（输出）
   * @param parentId 父节点ID
   */
  private convertNodesToFlat(
    structureNodes: MindMapStructure['nodes'],
    flatNodes: MindMapNode[],
    parentId: string | null
  ): void {
    for (const structureNode of structureNodes) {
      const nodeId = generateSecureId();
      const now = Date.now();
      
      // 创建节点
      const node: MindMapNode = {
        id: nodeId,
        content: structureNode.content,
        level: structureNode.level,
        parentId,
        children: [],
        collapsed: false,
        createdAt: now,
        updatedAt: now,
        style: this.getDefaultNodeStyle(structureNode.level)
      };
      
      flatNodes.push(node);
      
      // 如果有子节点，递归处理
      if (structureNode.children && structureNode.children.length > 0) {
        // 递归处理子节点
        this.convertNodesToFlat(structureNode.children, flatNodes, nodeId);
        
        // 找到刚添加的子节点并更新父节点的children数组
        const childNodes = flatNodes.filter(n => n.parentId === nodeId);
        node.children = childNodes.map(child => child.id);
      }
    }
  }

  /**
   * 为节点分配画布位置
   * @param nodes 节点数组
   */
  private assignNodePositions(nodes: MindMapNode[]): void {
    // 找到根节点
    const rootNodes = nodes.filter(node => node.parentId === null);
    
    if (rootNodes.length === 0) return;
    
    // 设置根节点位置
    const rootNode = rootNodes[0];
    rootNode.position = { x: 0, y: 0 };
    
    // 递归设置子节点位置
    this.assignChildrenPositions(nodes, rootNode, 0);
  }

  /**
   * 递归为子节点分配位置
   * @param allNodes 所有节点
   * @param parentNode 父节点
   * @param depth 当前深度
   */
  private assignChildrenPositions(
    allNodes: MindMapNode[], 
    parentNode: MindMapNode, 
    depth: number
  ): void {
    const children = allNodes.filter(node => 
      parentNode.children.includes(node.id)
    );
    
    if (children.length === 0) return;
    
    const horizontalSpacing = 300; // 水平间距
    const verticalSpacing = 100;   // 垂直间距
    const startX = (parentNode.position?.x || 0) + horizontalSpacing;
    const totalHeight = (children.length - 1) * verticalSpacing;
    const startY = (parentNode.position?.y || 0) - totalHeight / 2;
    
    children.forEach((child, index) => {
      child.position = {
        x: startX,
        y: startY + index * verticalSpacing
      };
      
      // 递归处理子节点的子节点
      this.assignChildrenPositions(allNodes, child, depth + 1);
    });
  }

  /**
   * 获取节点的默认样式
   * @param level 节点层级
   * @returns 节点样式
   */
  private getDefaultNodeStyle(level: number): NodeStyle {
    const styles: Record<number, NodeStyle> = {
      0: { // 根节点
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        textColor: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        borderWidth: 2,
        borderRadius: 8
      },
      1: { // 一级子节点
        backgroundColor: '#10b981',
        borderColor: '#059669',
        textColor: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        borderWidth: 2,
        borderRadius: 6
      },
      2: { // 二级子节点
        backgroundColor: '#f59e0b',
        borderColor: '#d97706',
        textColor: '#ffffff',
        fontSize: 14,
        fontWeight: 'normal',
        borderWidth: 1,
        borderRadius: 4
      },
      3: { // 三级子节点
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        textColor: '#ffffff',
        fontSize: 12,
        fontWeight: 'normal',
        borderWidth: 1,
        borderRadius: 4
      }
    };
    
    // 默认样式（四级及以上）
    return styles[level] || {
      backgroundColor: '#6b7280',
      borderColor: '#4b5563',
      textColor: '#ffffff',
      fontSize: 12,
      fontWeight: 'normal',
      borderWidth: 1,
      borderRadius: 4
    };
  }

  /**
   * 添加子节点
   * @param mindMapData 思维导图数据
   * @param parentId 父节点ID
   * @param content 节点内容
   * @returns 更新后的思维导图数据
   */
  addNode(mindMapData: MindMapData, parentId: string, content: string): MindMapData {
    const parentNode = mindMapData.nodes.find(node => node.id === parentId);
    if (!parentNode) {
      throw new Error('父节点不存在');
    }

    const newNodeId = generateSecureId();
    const now = Date.now();
    
    const newNode: MindMapNode = {
      id: newNodeId,
      content: content.trim() || '新节点',
      level: parentNode.level + 1,
      parentId,
      children: [],
      collapsed: false,
      createdAt: now,
      updatedAt: now,
      style: this.getDefaultNodeStyle(parentNode.level + 1),
      position: this.calculateNewNodePosition(mindMapData.nodes, parentNode)
    };

    // 更新父节点的children数组
    parentNode.children.push(newNodeId);
    parentNode.updatedAt = now;

    // 添加新节点到数组
    const updatedNodes = [...mindMapData.nodes, newNode];
    
    return {
      ...mindMapData,
      nodes: updatedNodes,
      updatedAt: now
    };
  }

  /**
   * 删除节点及其所有子节点
   * @param mindMapData 思维导图数据
   * @param nodeId 要删除的节点ID
   * @returns 更新后的思维导图数据
   */
  deleteNode(mindMapData: MindMapData, nodeId: string): MindMapData {
    const nodeToDelete = mindMapData.nodes.find(node => node.id === nodeId);
    if (!nodeToDelete) {
      throw new Error('要删除的节点不存在');
    }

    // 不允许删除根节点
    if (nodeToDelete.parentId === null) {
      throw new Error('不能删除根节点');
    }

    // 收集要删除的所有节点ID（包括子孙节点）
    const nodesToDelete = this.collectNodeAndDescendants(mindMapData.nodes, nodeId);
    
    // 从父节点的children数组中移除
    if (nodeToDelete.parentId) {
      const parentNode = mindMapData.nodes.find(node => node.id === nodeToDelete.parentId);
      if (parentNode) {
        parentNode.children = parentNode.children.filter(childId => childId !== nodeId);
        parentNode.updatedAt = Date.now();
      }
    }

    // 过滤掉要删除的节点
    const updatedNodes = mindMapData.nodes.filter(node => 
      !nodesToDelete.includes(node.id)
    );

    return {
      ...mindMapData,
      nodes: updatedNodes,
      updatedAt: Date.now()
    };
  }

  /**
   * 更新节点内容
   * @param mindMapData 思维导图数据
   * @param nodeId 节点ID
   * @param content 新内容
   * @returns 更新后的思维导图数据
   */
  updateNodeContent(mindMapData: MindMapData, nodeId: string, content: string): MindMapData {
    const nodeIndex = mindMapData.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error('节点不存在');
    }

    const updatedNodes = [...mindMapData.nodes];
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      content: content.trim() || '空节点',
      updatedAt: Date.now()
    };

    return {
      ...mindMapData,
      nodes: updatedNodes,
      updatedAt: Date.now()
    };
  }

  /**
   * 切换节点折叠状态
   * @param mindMapData 思维导图数据
   * @param nodeId 节点ID
   * @returns 更新后的思维导图数据
   */
  toggleNodeCollapse(mindMapData: MindMapData, nodeId: string): MindMapData {
    const nodeIndex = mindMapData.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error('节点不存在');
    }

    const updatedNodes = [...mindMapData.nodes];
    const node = updatedNodes[nodeIndex];
    
    updatedNodes[nodeIndex] = {
      ...node,
      collapsed: !node.collapsed,
      updatedAt: Date.now()
    };

    return {
      ...mindMapData,
      nodes: updatedNodes,
      updatedAt: Date.now()
    };
  }

  /**
   * 计算新节点的位置
   * @param nodes 所有节点
   * @param parentNode 父节点
   * @returns 新节点位置
   */
  private calculateNewNodePosition(nodes: MindMapNode[], parentNode: MindMapNode): { x: number; y: number } {
    const siblings = nodes.filter(node => node.parentId === parentNode.id);
    const verticalSpacing = 100;
    const horizontalSpacing = 300;
    
    const baseX = (parentNode.position?.x || 0) + horizontalSpacing;
    const baseY = (parentNode.position?.y || 0) + siblings.length * verticalSpacing;
    
    return { x: baseX, y: baseY };
  }

  /**
   * 收集节点及其所有后代节点的ID
   * @param nodes 所有节点
   * @param nodeId 起始节点ID
   * @returns 节点ID数组
   */
  private collectNodeAndDescendants(nodes: MindMapNode[], nodeId: string): string[] {
    const result = [nodeId];
    const node = nodes.find(n => n.id === nodeId);
    
    if (node && node.children.length > 0) {
      for (const childId of node.children) {
        result.push(...this.collectNodeAndDescendants(nodes, childId));
      }
    }
    
    return result;
  }

  /**
   * 验证API密钥
   * @param apiKey API密钥
   * @returns 是否有效
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      return await errorHandler.executeWithRetry(async () => {
        return await geminiService.validateApiKey(apiKey);
      }, {
        maxRetries: 1, // API密钥验证只重试1次
        baseDelay: 500
      });
    } catch (error) {
      const errorResult = errorHandler.handleError(error);
      console.error('API密钥验证失败:', errorResult.userMessage);
      return false;
    }
  }

  /**
   * 获取思维导图统计信息
   * @param mindMapData 思维导图数据
   * @returns 统计信息
   */
  getStatistics(mindMapData: MindMapData): {
    totalNodes: number;
    maxDepth: number;
    nodesByLevel: Record<number, number>;
  } {
    const totalNodes = mindMapData.nodes.length;
    const levels = mindMapData.nodes.map(node => node.level);
    const maxDepth = Math.max(...levels);
    
    const nodesByLevel: Record<number, number> = {};
    for (const level of levels) {
      nodesByLevel[level] = (nodesByLevel[level] || 0) + 1;
    }
    
    return {
      totalNodes,
      maxDepth,
      nodesByLevel
    };
  }
}

// 导出服务实例
export const mindMapService = new MindMapService();