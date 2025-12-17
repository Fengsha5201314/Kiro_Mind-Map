/**
 * 提示词模板配置
 * 为不同内容类型定义优化的提示词模板
 */

import { ContentType } from '../types/contentType';

// 提示词模板接口
export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * 提示词模板集合
 * 每种内容类型对应一个优化的提示词模板
 */
export const PROMPT_TEMPLATES: Record<ContentType, PromptTemplate> = {
  // 技术文档模板
  [ContentType.TECHNICAL_DOC]: {
    name: '技术文档',
    description: '适用于技术文档、API文档、代码说明等',
    systemPrompt: `你是一个专业的技术文档分析助手。你的任务是将技术文档转换为结构化的思维导图。

分析要求：
1. **概念层次**：识别核心概念、子概念和实现细节的层次关系
2. **API结构**：如果包含API，按照模块、类、方法的层次组织
3. **代码示例**：将代码示例归类到相应的概念节点下
4. **技术要点**：提取关键技术点、配置项、注意事项
5. **MECE原则**：确保各分支相互独立、完全穷尽
6. **金字塔原理**：结论先行，先总后分

输出格式：严格的JSON格式，包含title和nodes字段。`,
    
    userPromptTemplate: `请将以下技术文档转换为思维导图结构：

{content}

要求：
1. 识别技术架构和模块划分
2. 提取API接口和方法签名
3. 归纳配置项和参数说明
4. 整理代码示例和最佳实践
5. 层次清晰，每层不超过7个节点

请严格按照以下JSON格式返回：
{
  "title": "文档标题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [...]
    }
  ]
}`
  },

  // 会议记录模板
  [ContentType.MEETING_NOTES]: {
    name: '会议记录',
    description: '适用于会议纪要、讨论记录等',
    systemPrompt: `你是一个专业的会议记录整理助手。你的任务是将会议记录转换为结构化的思维导图。

分析要求：
1. **会议信息**：提取会议主题、时间、参会人等基本信息
2. **议题分类**：按议题组织讨论内容
3. **决策要点**：明确标注达成的决策和共识
4. **行动项**：清晰列出待办事项、责任人和截止时间
5. **MECE原则**：议题之间相互独立、完全覆盖
6. **金字塔原理**：先总结后细节

输出格式：严格的JSON格式，包含title和nodes字段。`,
    
    userPromptTemplate: `请将以下会议记录转换为思维导图结构：

{content}

要求：
1. 第一层：会议基本信息（主题、时间、参会人）
2. 第二层：主要议题
3. 第三层：每个议题的讨论要点
4. 第四层：决策结果和行动项
5. 突出显示责任人和截止日期

请严格按照以下JSON格式返回：
{
  "title": "会议主题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [...]
    }
  ]
}`
  },

  // 学习笔记模板
  [ContentType.STUDY_NOTES]: {
    name: '学习笔记',
    description: '适用于学习笔记、知识总结等',
    systemPrompt: `你是一个专业的学习笔记整理助手。你的任务是将学习笔记转换为结构化的思维导图。

分析要求：
1. **知识体系**：构建完整的知识框架
2. **概念关联**：识别概念之间的关联和依赖关系
3. **重点难点**：标注重点知识和难点
4. **示例应用**：整理典型例子和应用场景
5. **MECE原则**：知识点分类清晰、不重不漏
6. **金字塔原理**：从总体到细节，层层递进

输出格式：严格的JSON格式，包含title和nodes字段。`,
    
    userPromptTemplate: `请将以下学习笔记转换为思维导图结构：

{content}

要求：
1. 第一层：主题或章节
2. 第二层：核心概念和知识点
3. 第三层：概念解释和要点
4. 第四层：示例和应用
5. 突出重点和难点

请严格按照以下JSON格式返回：
{
  "title": "学习主题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [...]
    }
  ]
}`
  },

  // 项目计划模板
  [ContentType.PROJECT_PLAN]: {
    name: '项目计划',
    description: '适用于项目规划、任务分解等',
    systemPrompt: `你是一个专业的项目管理助手。你的任务是将项目计划转换为结构化的思维导图。

分析要求：
1. **项目目标**：明确项目的总体目标和预期成果
2. **阶段划分**：按时间线或里程碑划分项目阶段
3. **任务分解**：使用WBS方法分解任务
4. **资源依赖**：标注任务依赖关系和所需资源
5. **MECE原则**：任务分解完整、不重复
6. **金字塔原理**：从项目目标到具体任务

输出格式：严格的JSON格式，包含title和nodes字段。`,
    
    userPromptTemplate: `请将以下项目计划转换为思维导图结构：

{content}

要求：
1. 第一层：项目总体目标
2. 第二层：项目阶段或里程碑
3. 第三层：主要任务和交付物
4. 第四层：子任务和执行细节
5. 标注时间节点和责任人

请严格按照以下JSON格式返回：
{
  "title": "项目名称",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [...]
    }
  ]
}`
  },

  // 头脑风暴模板
  [ContentType.BRAINSTORM]: {
    name: '头脑风暴',
    description: '适用于创意收集、发散思维等',
    systemPrompt: `你是一个创意整理助手。你的任务是将头脑风暴内容转换为结构化的思维导图。

分析要求：
1. **主题聚焦**：识别核心主题和讨论方向
2. **创意分类**：将相似的想法归类整理
3. **关联发现**：发现创意之间的关联和延伸
4. **优先级**：如果有评估，标注重点创意
5. **MECE原则**：创意分类清晰
6. **发散思维**：保留创意的多样性

输出格式：严格的JSON格式，包含title和nodes字段。`,
    
    userPromptTemplate: `请将以下头脑风暴内容转换为思维导图结构：

{content}

要求：
1. 第一层：核心主题
2. 第二层：主要方向或类别
3. 第三层：具体创意和想法
4. 第四层：创意的延伸和细化
5. 保持创意的多样性和开放性

请严格按照以下JSON格式返回：
{
  "title": "头脑风暴主题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [...]
    }
  ]
}`
  },

  // 通用模板
  [ContentType.GENERAL]: {
    name: '通用内容',
    description: '适用于一般性内容',
    systemPrompt: `你是一个专业的内容分析助手。你的任务是将内容转换为结构化的思维导图。

分析要求：
1. **主题提取**：识别内容的核心主题
2. **逻辑结构**：分析内容的逻辑层次
3. **要点归纳**：提取关键信息和要点
4. **层次组织**：合理组织信息层次
5. **MECE原则**：分类清晰、不重不漏
6. **金字塔原理**：结论先行、逻辑清晰

输出格式：严格的JSON格式，包含title和nodes字段。`,
    
    userPromptTemplate: `请将以下内容转换为思维导图结构：

{content}

要求：
1. 识别核心主题和主要观点
2. 提取关键信息和要点
3. 组织清晰的层次结构
4. 每层节点数量适中（3-7个）
5. 层次深度适当（3-5层）

请严格按照以下JSON格式返回：
{
  "title": "内容标题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [...]
    }
  ]
}`
  }
};

/**
 * 获取指定类型的提示词模板
 * @param contentType 内容类型
 * @returns 提示词模板
 */
export function getPromptTemplate(contentType: ContentType): PromptTemplate {
  return PROMPT_TEMPLATES[contentType] || PROMPT_TEMPLATES[ContentType.GENERAL];
}

/**
 * 获取所有可用的提示词模板
 * @returns 所有模板的数组
 */
export function getAllPromptTemplates(): Array<{ type: ContentType; template: PromptTemplate }> {
  return Object.entries(PROMPT_TEMPLATES).map(([type, template]) => ({
    type: type as ContentType,
    template
  }));
}
