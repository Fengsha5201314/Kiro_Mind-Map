/**
 * Gemini服务使用示例
 * 演示如何使用Gemini AI服务生成思维导图
 */

import { geminiService, mindMapService } from '../services';

/**
 * 示例：验证API密钥
 */
export async function validateApiKeyExample(apiKey: string): Promise<void> {
  console.log('=== API密钥验证示例 ===');
  
  try {
    const isValid = await geminiService.validateApiKey(apiKey);
    console.log(`API密钥验证结果: ${isValid ? '有效' : '无效'}`);
  } catch (error) {
    console.error('API密钥验证失败:', error);
  }
}

/**
 * 示例：从文本内容生成思维导图
 */
export async function generateFromContentExample(apiKey: string): Promise<void> {
  console.log('\n=== 从内容生成思维导图示例 ===');
  
  const sampleContent = `
人工智能的发展历程

人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。

发展阶段：
1. 早期阶段（1950-1970）
   - 图灵测试的提出
   - 第一批AI程序的开发
   - 符号主义方法的兴起

2. 专家系统时代（1970-1990）
   - 知识表示和推理
   - 专家系统的广泛应用
   - 第一次AI寒冬

3. 机器学习时代（1990-2010）
   - 统计学习方法
   - 支持向量机
   - 随机森林等算法

4. 深度学习时代（2010至今）
   - 神经网络的复兴
   - 卷积神经网络
   - 大语言模型的出现

应用领域：
- 自然语言处理
- 计算机视觉
- 语音识别
- 推荐系统
- 自动驾驶
  `;

  try {
    const mindMapData = await mindMapService.generateFromContent(
      sampleContent, 
      apiKey, 
      'text'
    );
    
    console.log('生成的思维导图:');
    console.log(`标题: ${mindMapData.title}`);
    console.log(`节点数量: ${mindMapData.nodes.length}`);
    console.log(`处理时间: ${mindMapData.metadata?.processingTime}ms`);
    
    // 显示节点结构
    console.log('\n节点结构:');
    mindMapData.nodes.forEach(node => {
      const indent = '  '.repeat(node.level);
      console.log(`${indent}- ${node.content} (Level ${node.level})`);
    });
    
  } catch (error) {
    console.error('生成思维导图失败:', error);
  }
}

/**
 * 示例：从主题生成思维导图
 */
export async function generateFromTopicExample(apiKey: string): Promise<void> {
  console.log('\n=== 从主题生成思维导图示例 ===');
  
  const topic = '可持续发展';
  
  try {
    const mindMapData = await mindMapService.generateFromTopic(topic, apiKey);
    
    console.log('生成的思维导图:');
    console.log(`标题: ${mindMapData.title}`);
    console.log(`节点数量: ${mindMapData.nodes.length}`);
    console.log(`处理时间: ${mindMapData.metadata?.processingTime}ms`);
    
    // 显示节点结构
    console.log('\n节点结构:');
    mindMapData.nodes.forEach(node => {
      const indent = '  '.repeat(node.level);
      console.log(`${indent}- ${node.content} (Level ${node.level})`);
    });
    
    // 显示统计信息
    const stats = mindMapService.getStatistics(mindMapData);
    console.log('\n统计信息:');
    console.log(`总节点数: ${stats.totalNodes}`);
    console.log(`最大深度: ${stats.maxDepth}`);
    console.log('各层级节点数:', stats.nodesByLevel);
    
  } catch (error) {
    console.error('生成思维导图失败:', error);
  }
}

/**
 * 示例：思维导图编辑操作
 */
export async function editMindMapExample(apiKey: string): Promise<void> {
  console.log('\n=== 思维导图编辑示例 ===');
  
  try {
    // 先生成一个简单的思维导图
    let mindMapData = await mindMapService.generateFromTopic('学习计划', apiKey);
    console.log(`初始节点数: ${mindMapData.nodes.length}`);
    
    // 找到根节点
    const rootNode = mindMapData.nodes.find(node => node.parentId === null);
    if (!rootNode) {
      console.error('未找到根节点');
      return;
    }
    
    // 添加子节点
    mindMapData = mindMapService.addNode(mindMapData, rootNode.id, '新增学习目标');
    console.log(`添加节点后: ${mindMapData.nodes.length}`);
    
    // 更新节点内容
    const newNode = mindMapData.nodes.find(node => node.content === '新增学习目标');
    if (newNode) {
      mindMapData = mindMapService.updateNodeContent(mindMapData, newNode.id, '掌握TypeScript');
      console.log('节点内容已更新');
    }
    
    // 切换节点折叠状态
    mindMapData = mindMapService.toggleNodeCollapse(mindMapData, rootNode.id);
    console.log(`根节点折叠状态: ${rootNode.collapsed ? '折叠' : '展开'}`);
    
    console.log('编辑操作完成');
    
  } catch (error) {
    console.error('编辑思维导图失败:', error);
  }
}

/**
 * 运行所有示例
 * 注意：需要有效的Gemini API密钥才能运行
 */
export async function runAllExamples(): Promise<void> {
  // 这里需要替换为真实的API密钥
  const apiKey = 'YOUR_GEMINI_API_KEY_HERE';
  
  if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('请先设置有效的Gemini API密钥');
    return;
  }
  
  console.log('开始运行Gemini服务示例...\n');
  
  await validateApiKeyExample(apiKey);
  await generateFromContentExample(apiKey);
  await generateFromTopicExample(apiKey);
  await editMindMapExample(apiKey);
  
  console.log('\n所有示例运行完成！');
}

// 如果直接运行此文件，执行示例
// 注意：在浏览器环境中不会执行此代码
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}