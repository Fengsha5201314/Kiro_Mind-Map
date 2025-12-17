/**
 * 内容类型检测服务
 * 负责自动识别输入内容的类型（技术文档、会议记录、学习笔记、项目计划等）
 */

import {
  ContentType,
  ContentTypeDetectionResult,
  ContentTypeFeature
} from '../types/contentType';

/**
 * 内容类型检测器类
 */
export class ContentTypeDetector {
  // 各类型的特征配置
  private readonly typeFeatures: Record<ContentType, ContentTypeFeature> = {
    [ContentType.TECHNICAL_DOC]: {
      keywords: [
        'API', 'function', 'class', 'method', 'interface', 'implementation',
        '函数', '方法', '类', '接口', '实现', '算法', '架构', '设计模式',
        'code', 'syntax', 'parameter', 'return', 'exception',
        '代码', '语法', '参数', '返回值', '异常', '配置', '部署',
        'framework', 'library', 'module', 'package',
        '框架', '库', '模块', '包', '组件', '服务'
      ],
      patterns: [
        /```[\s\S]*?```/g,           // 代码块
        /`[^`]+`/g,                  // 行内代码
        /\b[A-Z][a-zA-Z]*\(\)/g,     // 函数调用
        /\b(GET|POST|PUT|DELETE)\b/g, // HTTP方法
        /\b(async|await|Promise)\b/g  // 异步关键词
      ],
      weight: 1.0
    },
    
    [ContentType.MEETING_NOTES]: {
      keywords: [
        '会议', '讨论', '决策', '行动项', '待办', '跟进',
        'meeting', 'discussion', 'decision', 'action item', 'follow-up',
        '议题', '参会人', '会议纪要', '会议记录', '会议时间',
        '决定', '共识', '分歧', '投票', '表决',
        '下一步', '责任人', '截止日期', 'deadline'
      ],
      patterns: [
        /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,  // 日期格式
        /\d{1,2}:\d{2}/g,                 // 时间格式
        /会议主题[:：]/g,
        /参会人[:：]/g,
        /行动项[:：]/g
      ],
      weight: 1.0
    },
    
    [ContentType.STUDY_NOTES]: {
      keywords: [
        '学习', '笔记', '知识点', '概念', '定义', '理解',
        'study', 'notes', 'concept', 'definition', 'understanding',
        '要点', '重点', '难点', '总结', '归纳',
        '例子', '示例', '练习', '习题', '复习',
        '记忆', '理论', '原理', '公式', '定理'
      ],
      patterns: [
        /第[一二三四五六七八九十\d]+[章节课]/g,
        /\d+\./g,                         // 编号列表
        /[①②③④⑤⑥⑦⑧⑨⑩]/g,              // 圆圈数字
        /重点[:：]/g,
        /总结[:：]/g
      ],
      weight: 1.0
    },
    
    [ContentType.PROJECT_PLAN]: {
      keywords: [
        '项目', '计划', '任务', '里程碑', '时间线', '进度',
        'project', 'plan', 'task', 'milestone', 'timeline', 'progress',
        '目标', '交付', '资源', '预算', '风险',
        '阶段', '迭代', 'sprint', '版本', 'release',
        '需求', '开发', '测试', '上线', '部署',
        '团队', '分工', '协作', '依赖'
      ],
      patterns: [
        /Q[1-4]/g,                        // 季度
        /\d{4}年\d{1,2}月/g,              // 年月
        /第[一二三四五\d]+阶段/g,
        /v\d+\.\d+/g,                     // 版本号
        /里程碑[:：]/g
      ],
      weight: 1.0
    },
    
    [ContentType.BRAINSTORM]: {
      keywords: [
        '头脑风暴', '创意', '想法', '点子', '灵感',
        'brainstorm', 'idea', 'creative', 'inspiration',
        '可能', '或许', '也许', '如果', '假设',
        '方案', '选项', '备选', '思路', '角度',
        '发散', '联想', '探索', '尝试'
      ],
      patterns: [
        /[?？]/g,                         // 问号（表示探索性）
        /[!！]/g,                         // 感叹号（表示创意）
        /\b(idea|option|alternative)\b/gi
      ],
      weight: 0.8
    },
    
    [ContentType.GENERAL]: {
      keywords: [],
      patterns: [],
      weight: 0.5
    }
  };

  // 最小置信度阈值
  private readonly MIN_CONFIDENCE = 0.3;

  /**
   * 检测内容类型
   * @param content 输入内容文本
   * @returns 检测结果
   */
  detectContentType(content: string): ContentTypeDetectionResult {
    if (!content || content.trim().length === 0) {
      return {
        type: ContentType.GENERAL,
        confidence: 1.0,
        matchedKeywords: []
      };
    }

    // 计算每种类型的得分
    const scores = new Map<ContentType, { score: number; keywords: string[] }>();
    
    for (const [type, features] of Object.entries(this.typeFeatures)) {
      const result = this.calculateTypeScore(content, features);
      scores.set(type as ContentType, result);
    }

    // 找出得分最高的类型
    let maxScore = 0;
    let detectedType = ContentType.GENERAL;
    let matchedKeywords: string[] = [];

    for (const [type, result] of scores.entries()) {
      if (result.score > maxScore) {
        maxScore = result.score;
        detectedType = type;
        matchedKeywords = result.keywords;
      }
    }

    // 计算置信度（归一化得分）
    const confidence = Math.min(maxScore / 10, 1.0);

    // 如果置信度太低，返回通用类型
    if (confidence < this.MIN_CONFIDENCE) {
      return {
        type: ContentType.GENERAL,
        confidence: 1.0,
        matchedKeywords: []
      };
    }

    // 找出其他可能的类型（得分接近的）
    const suggestedTypes: ContentType[] = [];
    for (const [type, result] of scores.entries()) {
      if (type !== detectedType && result.score > maxScore * 0.7) {
        suggestedTypes.push(type);
      }
    }

    return {
      type: detectedType,
      confidence,
      matchedKeywords,
      suggestedTypes: suggestedTypes.length > 0 ? suggestedTypes : undefined
    };
  }

  /**
   * 计算内容与特定类型的匹配得分
   * @param content 内容文本
   * @param features 类型特征
   * @returns 得分和匹配的关键词
   */
  private calculateTypeScore(
    content: string,
    features: ContentTypeFeature
  ): { score: number; keywords: string[] } {
    let score = 0;
    const matchedKeywords: string[] = [];
    const contentLower = content.toLowerCase();

    // 关键词匹配
    for (const keyword of features.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (contentLower.includes(keywordLower)) {
        score += features.weight;
        matchedKeywords.push(keyword);
      }
    }

    // 模式匹配
    for (const pattern of features.patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        score += matches.length * features.weight * 0.5;
      }
    }

    return { score, keywords: matchedKeywords };
  }

  /**
   * 获取内容类型的统计信息
   * @param content 内容文本
   * @returns 所有类型的得分统计
   */
  getTypeStatistics(content: string): Record<ContentType, number> {
    const statistics: Record<ContentType, number> = {} as any;

    for (const [type, features] of Object.entries(this.typeFeatures)) {
      const result = this.calculateTypeScore(content, features);
      statistics[type as ContentType] = result.score;
    }

    return statistics;
  }
}

// 导出服务实例
export const contentTypeDetector = new ContentTypeDetector();
