/**
 * 流式生成服务
 * 负责处理Gemini API的流式响应，实现实时生成思维导图节点
 */

import { MindMapStructure } from '../types/mindmap';
import { ContentType } from '../types/contentType';
import { promptTemplateManager } from './promptTemplateManager';
import { useSettingsStore } from '../stores/settingsStore';

// Gemini API基础URL
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// 流式生成配置
interface StreamingConfig {
  model?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

// 流式生成回调
export interface StreamingCallbacks {
  onStart?: () => void;
  onProgress?: (partialData: Partial<MindMapStructure>) => void;
  onComplete?: (data: MindMapStructure) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

/**
 * 流式生成服务类
 */
export class StreamingService {
  private abortController: AbortController | null = null;
  private readonly defaultConfig: StreamingConfig = {
    model: 'gemini-3-pro-preview',  // 使用最新的Gemini 3 Pro预览版模型
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192
  };

  /**
   * 获取用户选择的模型
   */
  private getUserSelectedModel(): string {
    try {
      const { settings } = useSettingsStore.getState();
      return settings.selectedModel || this.defaultConfig.model!;
    } catch (error) {
      console.warn('获取用户选择的模型失败，使用默认模型:', error);
      return this.defaultConfig.model!;
    }
  }

  /**
   * 流式生成思维导图
   * @param content 输入内容
   * @param apiKey API密钥
   * @param contentType 内容类型
   * @param callbacks 回调函数
   * @param config 配置选项
   */
  async streamGenerateMindMap(
    content: string,
    apiKey: string,
    contentType: ContentType,
    callbacks: StreamingCallbacks,
    config?: Partial<StreamingConfig>
  ): Promise<void> {
    // 创建新的AbortController
    this.abortController = new AbortController();

    try {
      // 触发开始回调
      callbacks.onStart?.();

      // 构建提示词
      const prompt = promptTemplateManager.buildFullPrompt(contentType, content);

      // 合并配置
      const finalConfig = {
        ...this.defaultConfig,
        ...config,
        model: config?.model || this.getUserSelectedModel()
      };

      // 调用流式API
      await this.callStreamingAPI(
        apiKey,
        finalConfig.model!,
        prompt,
        callbacks,
        finalConfig
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('流式生成已取消');
        callbacks.onCancel?.();
      } else {
        console.error('流式生成失败:', error);
        callbacks.onError?.(error);
      }
    }
  }

  /**
   * 调用Gemini流式API
   */
  private async callStreamingAPI(
    apiKey: string,
    model: string,
    prompt: string,
    callbacks: StreamingCallbacks,
    config: StreamingConfig
  ): Promise<void> {
    const url = `${GEMINI_API_BASE_URL}/models/${model}:streamGenerateContent`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController?.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // 处理流式响应
    await this.processStreamResponse(response, callbacks);
  }

  /**
   * 处理流式响应
   */
  private async processStreamResponse(
    response: Response,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let accumulatedText = '';
    const parser = new IncrementalJSONParser();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        
        // 解析流式响应（Gemini返回的是换行分隔的JSON）
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // 解析JSON行
            const data = JSON.parse(line);
            
            // 提取文本内容
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              accumulatedText += text;
              
              // 尝试解析部分JSON
              const partialData = parser.parse(accumulatedText);
              if (partialData) {
                callbacks.onProgress?.(partialData);
              }
            }
          } catch (error) {
            // 忽略解析错误，继续处理下一行
            console.debug('解析流式数据行失败:', error);
          }
        }
      }

      // 完成后解析最终结果
      const finalData = this.parseFinalResult(accumulatedText);
      callbacks.onComplete?.(finalData);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('处理流式响应失败:', error);
      
      // 尝试降级：使用累积的文本解析最终结果
      try {
        const fallbackData = this.parseFinalResult(accumulatedText);
        callbacks.onComplete?.(fallbackData);
      } catch (fallbackError) {
        throw error;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 解析最终结果
   */
  private parseFinalResult(text: string): MindMapStructure {
    // 清理文本
    let cleanedText = text.trim();
    
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

    try {
      const parsed = JSON.parse(cleanedText);
      
      // 验证结构
      if (!parsed.title || !Array.isArray(parsed.nodes)) {
        throw new Error('响应格式不正确');
      }

      // 规范化节点结构（处理类型转换）
      this.normalizeNodeStructure(parsed.nodes);

      return parsed as MindMapStructure;
    } catch (error) {
      console.error('解析最终结果失败:', error);
      
      // 返回默认结构
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
   * 取消流式生成
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 检查是否正在生成
   */
  isGenerating(): boolean {
    return this.abortController !== null;
  }
}

/**
 * 增量JSON解析器
 * 用于解析不完整的JSON片段
 */
class IncrementalJSONParser {
  /**
   * 尝试解析部分JSON
   * @param text 累积的文本
   * @returns 解析出的部分数据，如果无法解析则返回null
   */
  parse(text: string): Partial<MindMapStructure> | null {
    // 清理文本
    let cleanedText = text.trim();
    
    // 移除markdown代码块标记
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '');
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '');
    }

    // 尝试找到完整的JSON对象
    const result: Partial<MindMapStructure> = {};

    // 提取title
    const titleMatch = cleanedText.match(/"title"\s*:\s*"([^"]+)"/);
    if (titleMatch) {
      result.title = titleMatch[1];
    }

    // 尝试提取nodes数组
    try {
      // 查找nodes数组的开始
      const nodesStart = cleanedText.indexOf('"nodes"');
      if (nodesStart !== -1) {
        const arrayStart = cleanedText.indexOf('[', nodesStart);
        if (arrayStart !== -1) {
          // 尝试找到匹配的结束括号
          const partialNodes = this.extractPartialArray(cleanedText.substring(arrayStart));
          if (partialNodes) {
            result.nodes = partialNodes;
          }
        }
      }
    } catch (error) {
      // 忽略解析错误
      console.debug('提取部分节点失败:', error);
    }

    // 如果至少有title或nodes，返回结果
    if (result.title || result.nodes) {
      return result;
    }

    return null;
  }

  /**
   * 提取部分数组
   */
  private extractPartialArray(text: string): any[] | null {
    try {
      // 尝试找到完整的对象
      const objects: any[] = [];
      let depth = 0;
      let currentObj = '';
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
          currentObj += char;
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          currentObj += char;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          currentObj += char;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            if (depth === 0) {
              currentObj = char;
            } else {
              currentObj += char;
            }
            depth++;
          } else if (char === '}') {
            depth--;
            currentObj += char;
            
            if (depth === 0 && currentObj) {
              // 尝试解析完整的对象
              try {
                const obj = JSON.parse(currentObj);
                objects.push(obj);
                currentObj = '';
              } catch (e) {
                // 忽略解析错误
              }
            }
          } else if (depth > 0) {
            currentObj += char;
          }
        } else {
          currentObj += char;
        }
      }

      return objects.length > 0 ? objects : null;
    } catch (error) {
      return null;
    }
  }
}

// 导出服务实例
export const streamingService = new StreamingService();
