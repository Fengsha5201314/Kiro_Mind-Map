/**
 * Gemini AI服务
 * 负责与Google Gemini API交互，生成思维导图结构
 * 使用REST API v1beta版本直接调用，支持最新模型
 */

import { 
  GeminiService, 
  ApiError, 
  ApiKeyValidation 
} from '../types/api';
import { MindMapStructure } from '../types/mindmap';
import { apiCacheService } from './cacheService';
import { useSettingsStore } from '../stores/settingsStore';
import { ContentType } from '../types/contentType';
import { contentTypeDetector } from './contentTypeDetector';
import { promptTemplateManager } from './promptTemplateManager';

// Gemini API基础URL（使用v1beta版本以支持最新模型）
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini API服务实现类
 * 使用REST API直接调用，支持最新的Gemini模型
 * 参考: https://ai.google.dev/gemini-api/docs/gemini-3
 */
export class GeminiServiceImpl implements GeminiService {
  // 默认配置
  private readonly defaultConfig = {
    model: 'gemini-3-pro-preview', // 使用最新的Gemini 3 Pro预览版模型
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
    timeout: 60000, // 60秒超时
  };

  // 支持的模型列表（按优先级排序，用于回退）
  // 参考: https://ai.google.dev/gemini-api/docs/gemini-3
  // 参考: https://ai.google.dev/gemini-api/docs/models
  private readonly supportedModels = [
    'gemini-3-pro-preview',       // Gemini 3 Pro 预览版 - 最新最强
    'gemini-2.5-flash',           // Gemini 2.5 Flash - 稳定版
    'gemini-2.5-pro',             // Gemini 2.5 Pro - 高级思考模型
    'gemini-2.0-flash',           // Gemini 2.0 Flash - 稳定版
    'gemini-1.5-flash',           // Gemini 1.5 Flash - 旧版兼容
    'gemini-1.5-pro'              // Gemini 1.5 Pro - 旧版兼容
  ];

  /**
   * 获取用户选择的模型
   * @returns 用户选择的模型名称
   */
  private getUserSelectedModel(): string {
    try {
      const { settings } = useSettingsStore.getState();
      return settings.selectedModel || this.defaultConfig.model;
    } catch (error) {
      console.warn('获取用户选择的模型失败，使用默认模型:', error);
      return this.defaultConfig.model;
    }
  }

  /**
   * 直接调用Gemini REST API（v1beta版本）
   * @param apiKey API密钥
   * @param model 模型名称
   * @param prompt 提示词
   * @returns API响应文本
   */
  private async callGeminiAPI(apiKey: string, model: string, prompt: string): Promise<string> {
    const url = `${GEMINI_API_BASE_URL}/models/${model}:generateContent`;
    
    console.log(`调用Gemini API: ${url}`);
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: this.defaultConfig.temperature,
        topK: this.defaultConfig.topK,
        topP: this.defaultConfig.topP,
        maxOutputTokens: this.defaultConfig.maxOutputTokens,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('Gemini API错误:', errorMessage, errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // 提取响应文本
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('API响应中没有找到文本内容');
    }
    
    return text;
  }

  /**
   * 尝试使用不同模型进行API调用
   * @param apiKey API密钥
   * @param prompt 提示词
   * @returns API响应文本
   */
  private async tryWithDifferentModels(apiKey: string, prompt: string): Promise<string> {
    let lastError: any;
    
    // 获取用户选择的模型，并将其放在首位
    const userSelectedModel = this.getUserSelectedModel();
    const modelsToTry = [userSelectedModel, ...this.supportedModels.filter(m => m !== userSelectedModel)];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`尝试使用模型: ${modelName}`);
        const result = await this.callGeminiAPI(apiKey, modelName, prompt);
        console.log(`模型 ${modelName} 调用成功`);
        return result;
        
      } catch (error: any) {
        console.warn(`模型 ${modelName} 调用失败:`, error.message);
        lastError = error;
        
        // 如果是API密钥错误，不需要尝试其他模型
        if (error.message?.includes('API_KEY') || 
            error.message?.includes('invalid') ||
            error.message?.includes('unauthorized') ||
            error.message?.includes('401')) {
          break;
        }
        
        // 如果是404错误（模型不存在），继续尝试下一个模型
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          continue;
        }
        
        // 其他错误也继续尝试
        continue;
      }
    }
    
    // 所有模型都失败了，抛出最后一个错误
    throw lastError;
  }

  /**
   * 验证API密钥有效性
   * @param apiKey API密钥
   * @returns 验证结果
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    console.log('开始验证API密钥:', { hasApiKey: !!apiKey, keyLength: apiKey?.length });
    
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        console.error('API密钥为空');
        return false;
      }

      console.log('发送测试请求验证API密钥...');
      const result = await this.tryWithDifferentModels(apiKey, '你好，请简单回复');
      
      const isValid: boolean = !!(result && result.length > 0);
      console.log('API密钥验证结果:', isValid);
      
      return isValid;
    } catch (error: any) {
      console.error('API密钥验证失败:', error.message);
      return false;
    }
  }

  /**
   * 根据内容生成思维导图（支持智能内容类型检测）
   * @param content 输入内容
   * @param apiKey API密钥
   * @param contentType 可选的内容类型（如果不提供则自动检测）
   * @returns 生成的思维导图结构
   */
  async generateMindMap(
    content: string, 
    apiKey: string,
    contentType?: ContentType
  ): Promise<MindMapStructure> {
    try {
      if (!content || content.trim().length === 0) {
        throw this.createApiError('INVALID_INPUT', '输入内容不能为空');
      }

      if (!apiKey || apiKey.trim().length === 0) {
        throw this.createApiError('INVALID_API_KEY', 'API密钥不能为空');
      }

      // 自动检测内容类型（如果未提供）
      let detectedType = contentType;
      if (!detectedType) {
        const detection = contentTypeDetector.detectContentType(content);
        detectedType = detection.type;
        console.log('检测到内容类型:', detectedType, '置信度:', detection.confidence);
      }

      // 检查缓存
      const cacheKey = 'generateMindMap';
      const cacheParams = { 
        content: content.substring(0, 1000),
        contentHash: this.hashContent(content),
        contentType: detectedType
      };
      
      const cachedResult = apiCacheService.getAPIResponse<MindMapStructure>(cacheKey, cacheParams);
      if (cachedResult) {
        console.log('从缓存加载思维导图生成结果');
        return cachedResult;
      }

      // 使用智能提示词模板
      const prompt = this.buildMindMapPromptWithTemplate(content, detectedType);
      
      // 使用REST API直接调用
      const responseText = await this.tryWithDifferentModels(apiKey, prompt);
      const mindMapStructure = this.parseMindMapResponse(responseText);
      
      // 缓存结果
      apiCacheService.cacheAPIResponse(cacheKey, cacheParams, mindMapStructure, 10 * 60 * 1000);
      console.log('缓存思维导图生成结果');
      
      return mindMapStructure;
    } catch (error: any) {
      console.error('生成思维导图失败:', error);
      throw this.createApiError('GENERATION_FAILED', error.message || '生成失败，请重试');
    }
  }

  /**
   * 根据主题生成思维导图（支持智能内容类型）
   * @param topic 主题文本
   * @param apiKey API密钥
   * @param contentType 可选的内容类型
   * @returns 生成的思维导图结构
   */
  async generateFromTopic(
    topic: string, 
    apiKey: string,
    contentType?: ContentType
  ): Promise<MindMapStructure> {
    console.log('开始生成主题思维导图:', { topic, hasApiKey: !!apiKey });
    
    try {
      if (!topic || topic.trim().length === 0) {
        console.error('主题为空');
        throw this.createApiError('INVALID_INPUT', '主题不能为空');
      }

      if (!apiKey || apiKey.trim().length === 0) {
        console.error('API密钥为空');
        throw this.createApiError('INVALID_API_KEY', 'API密钥不能为空');
      }

      // 使用通用类型或指定类型
      const type = contentType || ContentType.GENERAL;

      // 检查缓存
      const cacheKey = 'generateFromTopic';
      const cacheParams = { 
        topic: topic.trim(),
        topicHash: this.hashContent(topic),
        contentType: type
      };
      
      const cachedResult = apiCacheService.getAPIResponse<MindMapStructure>(cacheKey, cacheParams);
      if (cachedResult) {
        console.log('从缓存加载主题思维导图生成结果');
        return cachedResult;
      }

      // 使用智能提示词模板
      const prompt = this.buildTopicPromptWithTemplate(topic, type);
      console.log('构建的提示词:', prompt.substring(0, 200) + '...');
      
      // 使用REST API直接调用
      console.log('开始调用Gemini API (v1beta)...');
      const responseText = await this.tryWithDifferentModels(apiKey, prompt);
      
      console.log('API调用成功，开始解析响应...');
      console.log('AI响应文本:', responseText.substring(0, 500) + '...');
      
      const mindMapStructure = this.parseMindMapResponse(responseText);
      console.log('解析成功，思维导图结构:', mindMapStructure);
      
      // 缓存结果
      apiCacheService.cacheAPIResponse(cacheKey, cacheParams, mindMapStructure, 15 * 60 * 1000);
      console.log('缓存主题思维导图生成结果');
      
      return mindMapStructure;
    } catch (error: any) {
      console.error('生成主题思维导图失败:', error);
      throw this.createApiError('GENERATION_FAILED', error.message || '生成失败，请重试');
    }
  }

  /**
   * 使用智能模板构建思维导图生成提示词
   * @param content 输入内容
   * @param contentType 内容类型
   * @returns 结构化提示词
   */
  private buildMindMapPromptWithTemplate(content: string, contentType: ContentType): string {
    return promptTemplateManager.buildFullPrompt(contentType, content);
  }

  /**
   * 使用智能模板构建主题生成提示词
   * @param topic 主题文本
   * @param contentType 内容类型
   * @returns 结构化提示词
   */
  private buildTopicPromptWithTemplate(topic: string, contentType: ContentType): string {
    // 为主题生成构建特殊的内容文本
    const content = `请根据主题"${topic}"生成一个详细的思维导图。`;
    return promptTemplateManager.buildFullPrompt(contentType, content);
  }

  /**
   * 解析AI响应为思维导图结构
   * @param responseText AI响应文本
   * @returns 解析后的思维导图结构
   */
  private parseMindMapResponse(responseText: string): MindMapStructure {
    try {
      // 清理响应文本，移除可能的markdown代码块标记
      let cleanedText = responseText.trim();
      
      // 移除markdown代码块标记（支持多种格式）
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/i, '');
      cleanedText = cleanedText.trim();
      
      // 尝试提取 JSON 对象（处理 AI 可能在 JSON 前后添加额外文本的情况）
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      // 移除可能的 BOM 和其他不可见字符
      cleanedText = cleanedText.replace(/^\uFEFF/, '');
      cleanedText = cleanedText.replace(/[\x00-\x1F\x7F]/g, (char) => {
        // 保留换行符和制表符
        if (char === '\n' || char === '\r' || char === '\t') return char;
        return '';
      });

      console.log('清理后的JSON文本:', cleanedText.substring(0, 500));

      // 尝试解析JSON
      let parsed;
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('JSON解析错误，尝试修复常见问题...');
        
        // 尝试修复常见的 JSON 格式问题
        // 1. 移除尾部逗号
        cleanedText = cleanedText.replace(/,\s*([}\]])/g, '$1');
        // 2. 修复单引号
        cleanedText = cleanedText.replace(/'/g, '"');
        // 3. 修复未转义的换行符
        cleanedText = cleanedText.replace(/\n/g, '\\n');
        cleanedText = cleanedText.replace(/\r/g, '\\r');
        cleanedText = cleanedText.replace(/\t/g, '\\t');
        
        // 再次尝试解析
        try {
          // 恢复换行符用于 JSON 结构
          cleanedText = cleanedText.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
          parsed = JSON.parse(cleanedText);
        } catch (retryError) {
          console.error('修复后仍然无法解析:', retryError);
          throw parseError;
        }
      }
      
      // 验证解析结果的结构
      if (!parsed.title || !Array.isArray(parsed.nodes)) {
        throw new Error('响应格式不正确：缺少title或nodes字段');
      }

      // 规范化节点结构（处理类型转换）
      this.normalizeNodeStructure(parsed.nodes);

      console.log('解析成功，节点数量:', this.countNodes(parsed.nodes));
      return parsed as MindMapStructure;
    } catch (error) {
      console.error('解析AI响应失败:', error);
      console.error('原始响应:', responseText.substring(0, 1000));
      
      // 尝试从响应中提取有用信息创建简单结构
      const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : '解析失败';
      
      // 如果解析失败，返回一个默认结构
      return {
        title: title,
        nodes: [
          {
            content: '无法解析AI响应，请重试',
            level: 0,
            children: []
          }
        ]
      };
    }
  }
  
  /**
   * 统计节点总数（用于调试）
   */
  private countNodes(nodes: any[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        count += this.countNodes(node.children);
      }
    }
    return count;
  }

  /**
   * 规范化节点结构（处理类型转换和默认值）
   * AI 返回的 JSON 可能存在类型不一致的情况，这里进行统一处理
   * @param nodes 节点数组
   */
  private normalizeNodeStructure(nodes: any[]): void {
    for (const node of nodes) {
      // 确保 content 是字符串
      if (node.content === undefined || node.content === null) {
        node.content = '';
      } else if (typeof node.content !== 'string') {
        node.content = String(node.content);
      }
      
      // 确保 level 是数字（AI 可能返回字符串类型的数字）
      if (typeof node.level === 'string') {
        node.level = parseInt(node.level, 10);
      }
      if (typeof node.level !== 'number' || isNaN(node.level)) {
        node.level = 0; // 默认为根节点级别
      }
      
      // 确保 children 是数组
      if (!Array.isArray(node.children)) {
        node.children = [];
      }
      
      // 递归处理子节点
      if (node.children.length > 0) {
        this.normalizeNodeStructure(node.children);
      }
    }
  }



  /**
   * 生成内容哈希值（用于缓存键）
   * @param content 内容字符串
   * @returns 哈希值
   */
  private hashContent(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 创建API错误对象
   * @param code 错误代码
   * @param message 错误消息
   * @returns API错误对象
   */
  private createApiError(code: string, message: string): ApiError {
    const error = new Error(message) as Error & ApiError;
    error.code = code;
    error.message = message;
    error.timestamp = Date.now();
    return error;
  }
}

// 导出服务实例
export const geminiService = new GeminiServiceImpl();

// 导出类型和接口
export type { GeminiService, ApiError, ApiKeyValidation };