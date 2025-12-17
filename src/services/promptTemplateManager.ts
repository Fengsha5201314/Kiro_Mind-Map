/**
 * 提示词模板管理器
 * 负责管理和渲染不同类型的提示词模板
 */

import { ContentType } from '../types/contentType';
import { PromptTemplate, getPromptTemplate } from '../config/promptTemplates';

/**
 * 提示词渲染结果
 */
export interface RenderedPrompt {
  systemPrompt: string;
  userPrompt: string;
  contentType: ContentType;
  templateName: string;
}

/**
 * 提示词模板管理器类
 */
export class PromptTemplateManager {
  /**
   * 根据内容类型获取模板
   * @param contentType 内容类型
   * @returns 提示词模板
   */
  getTemplate(contentType: ContentType): PromptTemplate {
    return getPromptTemplate(contentType);
  }

  /**
   * 渲染提示词模板
   * @param contentType 内容类型
   * @param content 用户输入的内容
   * @param variables 额外的模板变量
   * @returns 渲染后的提示词
   */
  renderPrompt(
    contentType: ContentType,
    content: string,
    variables?: Record<string, string>
  ): RenderedPrompt {
    const template = this.getTemplate(contentType);
    
    // 构建变量映射
    const vars: Record<string, string> = {
      content,
      ...variables
    };

    // 渲染用户提示词
    const userPrompt = this.replaceVariables(template.userPromptTemplate, vars);

    return {
      systemPrompt: template.systemPrompt,
      userPrompt,
      contentType,
      templateName: template.name
    };
  }

  /**
   * 构建完整的提示词（用于单次对话）
   * @param contentType 内容类型
   * @param content 用户输入的内容
   * @param variables 额外的模板变量
   * @returns 完整的提示词文本
   */
  buildFullPrompt(
    contentType: ContentType,
    content: string,
    variables?: Record<string, string>
  ): string {
    const rendered = this.renderPrompt(contentType, content, variables);
    
    return `${rendered.systemPrompt}

---

${rendered.userPrompt}`;
  }

  /**
   * 替换模板中的变量
   * @param template 模板字符串
   * @param variables 变量映射
   * @returns 替换后的字符串
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    
    // 替换 {variable} 格式的变量
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * 验证模板变量是否完整
   * @param template 模板字符串
   * @param variables 提供的变量
   * @returns 缺失的变量列表
   */
  validateTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): string[] {
    const placeholderRegex = /\{([^}]+)\}/g;
    const matches = template.matchAll(placeholderRegex);
    const missingVars: string[] = [];
    
    for (const match of matches) {
      const varName = match[1];
      if (!(varName in variables)) {
        missingVars.push(varName);
      }
    }
    
    return missingVars;
  }

  /**
   * 获取模板中需要的变量列表
   * @param contentType 内容类型
   * @returns 变量名列表
   */
  getRequiredVariables(contentType: ContentType): string[] {
    const template = this.getTemplate(contentType);
    const placeholderRegex = /\{([^}]+)\}/g;
    const variables = new Set<string>();
    
    const matches = template.userPromptTemplate.matchAll(placeholderRegex);
    for (const match of matches) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }

  /**
   * 注册自定义模板（用于扩展）
   * 注意：当前实现使用静态配置，此方法为未来扩展预留
   * @param contentType 内容类型
   * @param template 模板配置
   */
  registerTemplate(contentType: ContentType, template: PromptTemplate): void {
    // 预留接口，用于未来支持动态注册模板
    console.warn('动态注册模板功能尚未实现，请在 promptTemplates.ts 中配置');
  }
}

// 导出服务实例
export const promptTemplateManager = new PromptTemplateManager();
