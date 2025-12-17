/**
 * 内容类型相关类型定义
 */

// 内容类型枚举
export enum ContentType {
  TECHNICAL_DOC = 'technical_doc',       // 技术文档
  MEETING_NOTES = 'meeting_notes',       // 会议记录
  STUDY_NOTES = 'study_notes',           // 学习笔记
  PROJECT_PLAN = 'project_plan',         // 项目计划
  BRAINSTORM = 'brainstorm',             // 头脑风暴
  GENERAL = 'general'                    // 通用内容
}

// 内容类型显示名称映射
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.TECHNICAL_DOC]: '技术文档',
  [ContentType.MEETING_NOTES]: '会议记录',
  [ContentType.STUDY_NOTES]: '学习笔记',
  [ContentType.PROJECT_PLAN]: '项目计划',
  [ContentType.BRAINSTORM]: '头脑风暴',
  [ContentType.GENERAL]: '通用内容'
};

// 内容类型描述
export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  [ContentType.TECHNICAL_DOC]: '包含技术概念、API文档、代码示例等',
  [ContentType.MEETING_NOTES]: '包含会议议题、讨论要点、决策和行动项',
  [ContentType.STUDY_NOTES]: '包含知识点、概念解释、学习要点',
  [ContentType.PROJECT_PLAN]: '包含项目目标、任务分解、时间线和里程碑',
  [ContentType.BRAINSTORM]: '包含创意想法、发散思维、多个主题',
  [ContentType.GENERAL]: '通用内容，不属于特定类型'
};

// 内容类型检测结果
export interface ContentTypeDetectionResult {
  type: ContentType;              // 检测到的内容类型
  confidence: number;             // 置信度（0-1）
  matchedKeywords: string[];      // 匹配到的关键词
  suggestedTypes?: ContentType[]; // 建议的其他可能类型
}

// 内容类型特征配置
export interface ContentTypeFeature {
  keywords: string[];             // 关键词列表
  patterns: RegExp[];             // 正则表达式模式
  weight: number;                 // 权重（用于计算置信度）
}
