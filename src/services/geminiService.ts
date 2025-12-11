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

// Gemini API基础URL（使用v1beta版本以支持最新模型）
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini API服务实现类
 * 使用REST API直接调用，支持gemini-3-pro-preview等最新模型
 */
export class GeminiServiceImpl implements GeminiService {
  // 默认配置
  private readonly defaultConfig = {
    model: 'gemini-3-pro-preview', // 使用最新的Gemini 3预览版模型
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
    timeout: 60000, // 60秒超时
  };

  // 支持的模型列表（按优先级排序，用于回退）
  // 参考: https://ai.google.dev/gemini-api/docs/models
  // 参考: https://ai.google.dev/gemini-api/docs/gemini-3
  private readonly supportedModels = [
    'gemini-3-pro-preview',       // 最新 Gemini 3 Pro 预览版
    'gemini-2.0-flash',           // 稳定版 Gemini 2.0 Flash
    'gemini-2.0-flash-lite',      // 轻量版 Gemini 2.0 Flash
    'gemini-1.5-flash',           // Gemini 1.5 Flash
    'gemini-1.5-pro',             // Gemini 1.5 Pro
    'gemini-pro'                  // 旧版 Gemini Pro
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
   * 根据内容生成思维导图
   * @param content 输入内容
   * @param apiKey API密钥
   * @returns 生成的思维导图结构
   */
  async generateMindMap(content: string, apiKey: string): Promise<MindMapStructure> {
    try {
      if (!content || content.trim().length === 0) {
        throw this.createApiError('INVALID_INPUT', '输入内容不能为空');
      }

      if (!apiKey || apiKey.trim().length === 0) {
        throw this.createApiError('INVALID_API_KEY', 'API密钥不能为空');
      }

      // 检查缓存
      const cacheKey = 'generateMindMap';
      const cacheParams = { 
        content: content.substring(0, 1000),
        contentHash: this.hashContent(content)
      };
      
      const cachedResult = apiCacheService.getAPIResponse<MindMapStructure>(cacheKey, cacheParams);
      if (cachedResult) {
        console.log('从缓存加载思维导图生成结果');
        return cachedResult;
      }

      const prompt = this.buildMindMapPrompt(content);
      
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
   * 根据主题生成思维导图
   * @param topic 主题文本
   * @param apiKey API密钥
   * @returns 生成的思维导图结构
   */
  async generateFromTopic(topic: string, apiKey: string): Promise<MindMapStructure> {
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

      // 检查缓存
      const cacheKey = 'generateFromTopic';
      const cacheParams = { 
        topic: topic.trim(),
        topicHash: this.hashContent(topic)
      };
      
      const cachedResult = apiCacheService.getAPIResponse<MindMapStructure>(cacheKey, cacheParams);
      if (cachedResult) {
        console.log('从缓存加载主题思维导图生成结果');
        return cachedResult;
      }

      const prompt = this.buildTopicPrompt(topic);
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
   * 构建思维导图生成提示词
   * @param content 输入内容
   * @returns 结构化提示词
   */
  private buildMindMapPrompt(content: string): string {
    return `
请将以下内容转换为思维导图结构。请严格按照以下JSON格式返回，不要包含任何其他文字说明：

{
  "title": "思维导图标题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [
        {
          "content": "子节点内容",
          "level": 1,
          "children": [
            {
              "content": "孙节点内容",
              "level": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}

要求：
1. 提取内容的核心主题作为标题
2. 识别主要概念和子概念的层次关系
3. 每个节点的content应该简洁明了
4. level从0开始，表示节点层级
5. 最多不超过5层深度
6. 确保返回的是有效的JSON格式

输入内容：
${content}
`;
  }

  /**
   * 构建主题生成提示词
   * @param topic 主题文本
   * @returns 结构化提示词
   */
  private buildTopicPrompt(topic: string): string {
    return `
请根据主题"${topic}"生成一个详细的思维导图结构。请严格按照以下JSON格式返回，不要包含任何其他文字说明：

{
  "title": "思维导图标题",
  "nodes": [
    {
      "content": "根节点内容",
      "level": 0,
      "children": [
        {
          "content": "子节点内容",
          "level": 1,
          "children": [
            {
              "content": "孙节点内容",
              "level": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}

要求：
1. 以"${topic}"为核心主题
2. 生成相关的主要分支和子分支
3. 包含该主题的关键概念、特点、应用等方面
4. 每个节点的content应该简洁明了
5. level从0开始，表示节点层级
6. 生成3-5层的层次结构
7. 确保返回的是有效的JSON格式
8. 内容要丰富且有逻辑性
`;
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
      
      // 移除markdown代码块标记
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '');
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '');
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.replace(/\s*```$/, '');
      }

      // 尝试解析JSON
      const parsed = JSON.parse(cleanedText);
      
      // 验证解析结果的结构
      if (!parsed.title || !Array.isArray(parsed.nodes)) {
        throw new Error('响应格式不正确：缺少title或nodes字段');
      }

      // 验证节点结构
      this.validateNodeStructure(parsed.nodes);

      return parsed as MindMapStructure;
    } catch (error) {
      console.error('解析AI响应失败:', error);
      console.error('原始响应:', responseText);
      
      // 如果解析失败，返回一个默认结构
      return {
        title: '解析失败',
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
   * 验证节点结构的有效性
   * @param nodes 节点数组
   */
  private validateNodeStructure(nodes: any[]): void {
    for (const node of nodes) {
      if (typeof node.content !== 'string') {
        throw new Error('节点content必须是字符串');
      }
      if (typeof node.level !== 'number') {
        throw new Error('节点level必须是数字');
      }
      if (!Array.isArray(node.children)) {
        throw new Error('节点children必须是数组');
      }
      
      // 递归验证子节点
      if (node.children.length > 0) {
        this.validateNodeStructure(node.children);
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