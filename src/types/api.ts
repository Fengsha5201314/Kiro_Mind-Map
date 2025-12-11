/**
 * API相关类型定义
 */

import { MindMapStructure } from './mindmap';

// Gemini API服务接口
export interface GeminiService {
  /**
   * 根据内容生成思维导图
   * @param content 输入内容
   * @param apiKey API密钥
   * @returns 生成的思维导图结构
   */
  generateMindMap(content: string, apiKey: string): Promise<MindMapStructure>;
  
  /**
   * 验证API密钥有效性
   * @param apiKey API密钥
   * @returns 是否有效
   */
  validateApiKey(apiKey: string): Promise<boolean>;
  
  /**
   * 根据主题生成思维导图
   * @param topic 主题文本
   * @param apiKey API密钥
   * @returns 生成的思维导图结构
   */
  generateFromTopic(topic: string, apiKey: string): Promise<MindMapStructure>;
}

// API请求配置
export interface ApiConfig {
  baseUrl?: string;              // API基础URL
  timeout?: number;              // 请求超时时间（毫秒）
  retryCount?: number;           // 重试次数
  retryDelay?: number;           // 重试延迟（毫秒）
}

// API错误类型
export interface ApiError {
  code: string;                  // 错误代码
  message: string;               // 错误消息
  details?: any;                 // 错误详情
  timestamp: number;             // 错误发生时间
}

// API响应基础结构
export interface ApiResponse<T = any> {
  success: boolean;              // 请求是否成功
  data?: T;                      // 响应数据
  error?: ApiError;              // 错误信息
  requestId?: string;            // 请求ID
}

// Gemini API请求参数
export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;         // 生成温度
    topK?: number;               // Top-K采样
    topP?: number;               // Top-P采样
    maxOutputTokens?: number;    // 最大输出token数
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

// Gemini API响应结构
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

// API调用状态
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// API调用结果
export interface ApiResult<T = any> {
  status: ApiStatus;
  data?: T;
  error?: ApiError;
  loading: boolean;
}

// 文件上传API类型
export interface FileUploadResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  content: string;
  error?: string;
}

// API密钥验证结果
export interface ApiKeyValidation {
  isValid: boolean;
  error?: string;
  model?: string;
  quota?: {
    used: number;
    limit: number;
  };
}