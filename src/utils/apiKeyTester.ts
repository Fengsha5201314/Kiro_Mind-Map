/**
 * API密钥测试工具
 * 用于诊断API密钥和网络连接问题
 * 使用REST API v1beta版本直接调用，支持模型回退
 */

import { useSettingsStore, SUPPORTED_MODELS } from '../stores/settingsStore';

// Gemini API基础URL（使用v1beta版本）
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface ApiTestResult {
  success: boolean;
  error?: string;
  details?: any;
  responseTime?: number;
  actualModel?: string; // 实际使用的模型
}

/**
 * 测试单个模型
 * @param apiKey API密钥
 * @param model 模型名称
 * @returns 测试结果
 */
async function testSingleModel(apiKey: string, model: string): Promise<{ success: boolean; response?: string; error?: string; status?: number }> {
  const url = `${GEMINI_API_BASE_URL}/models/${model}:generateContent`;
  
  console.log(`测试模型: ${model}`);
  console.log(`请求URL: ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: '你好，请简单回复'
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    return { success: false, error: errorMessage, status: response.status };
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { success: true, response: responseText };
}

/**
 * 测试API密钥是否有效（使用REST API v1beta，支持模型回退）
 * @param apiKey API密钥
 * @returns 测试结果
 */
export async function testApiKey(apiKey: string): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('开始测试API密钥...');
    
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        success: false,
        error: 'API密钥为空'
      };
    }

    // 获取用户选择的模型
    const { settings } = useSettingsStore.getState();
    const selectedModel = settings.selectedModel || 'gemini-3-pro-preview';
    
    // 构建模型尝试列表：用户选择的模型优先，然后是其他模型
    const allModelIds = SUPPORTED_MODELS.map(m => m.id);
    const modelsToTry = [selectedModel, ...allModelIds.filter(m => m !== selectedModel)];
    
    console.log(`用户选择的模型: ${selectedModel}`);
    console.log(`将按顺序尝试: ${modelsToTry.join(', ')}`);

    let lastError: string = '';
    let lastStatus: number = 0;
    
    // 依次尝试每个模型
    for (const model of modelsToTry) {
      const result = await testSingleModel(apiKey, model);
      
      if (result.success) {
        const responseTime = Date.now() - startTime;
        const actualModel = model;
        const wasFirstChoice = model === selectedModel;
        
        console.log(`✅ 模型 ${model} 测试成功`);
        if (!wasFirstChoice) {
          console.log(`⚠️ 注意: 用户选择的模型 ${selectedModel} 不可用，已回退到 ${model}`);
        }
        
        return {
          success: true,
          responseTime,
          actualModel,
          details: {
            responseLength: result.response?.length || 0,
            response: (result.response?.substring(0, 100) || '') + '...',
            modelUsed: actualModel,
            requestedModel: selectedModel,
            wasFirstChoice,
            message: wasFirstChoice 
              ? `使用模型: ${actualModel}` 
              : `用户选择的 ${selectedModel} 不可用，已使用 ${actualModel}`
          }
        };
      }
      
      // 记录错误
      console.warn(`❌ 模型 ${model} 测试失败: ${result.error}`);
      lastError = result.error || '未知错误';
      lastStatus = result.status || 0;
      
      // 如果是API密钥错误，不需要尝试其他模型
      if (lastStatus === 401 || lastError.includes('API_KEY') || lastError.includes('invalid') || lastError.includes('unauthorized')) {
        break;
      }
      
      // 如果是配额错误，也不需要尝试其他模型
      if (lastStatus === 429 || lastError.includes('quota')) {
        break;
      }
      
      // 404错误（模型不存在），继续尝试下一个模型
      if (lastStatus === 404 || lastError.includes('not found')) {
        continue;
      }
    }

    // 所有模型都失败了
    const responseTime = Date.now() - startTime;
    
    let details: any = { errorType: 'API_ERROR', triedModels: modelsToTry };
    
    if (lastStatus === 401 || lastError.includes('API_KEY')) {
      details.errorType = 'INVALID_API_KEY';
      return {
        success: false,
        error: 'API密钥无效，请检查密钥是否正确',
        responseTime,
        details
      };
    }
    
    if (lastStatus === 429 || lastError.includes('quota')) {
      details.errorType = 'QUOTA_EXCEEDED';
      return {
        success: false,
        error: 'API配额已用完或达到限制',
        responseTime,
        details
      };
    }
    
    return {
      success: false,
      error: `所有模型都不可用: ${lastError}`,
      responseTime,
      details
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('API测试失败:', error);
    
    let errorMessage = '未知错误';
    let details: any = {};
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // 分析具体错误类型
    if (error.message?.includes('network') || 
        error.message?.includes('fetch') ||
        error.message?.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查网络连接';
      details.errorType = 'NETWORK_ERROR';
    } else if (error.message?.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
      details.errorType = 'TIMEOUT_ERROR';
    }
    
    return {
      success: false,
      error: errorMessage,
      responseTime,
      details: {
        ...details,
        originalError: error.message,
        errorName: error.name
      }
    };
  }
}

/**
 * 测试网络连接
 * 注意：使用 no-cors 模式时，即使服务器返回404，fetch也不会抛出错误
 * 只有真正的网络问题（如DNS解析失败、连接超时）才会抛出错误
 * @returns 测试结果
 */
export async function testNetworkConnection(): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('测试网络连接...');
    
    // 使用 no-cors 模式测试网络连通性
    // 这种模式下，即使返回404也算网络连通
    // 只有真正的网络问题才会抛出错误
    await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      mode: 'no-cors'
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`网络连接测试完成，耗时: ${responseTime}ms`);
    
    return {
      success: true,
      responseTime,
      details: {
        status: '网络连接正常'
      }
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('网络连接测试失败:', error);
    
    return {
      success: false,
      error: '网络连接失败，请检查网络设置',
      responseTime,
      details: {
        originalError: error.message,
        errorName: error.name
      }
    };
  }
}

/**
 * 综合诊断
 * @param apiKey API密钥
 * @returns 诊断结果
 */
export async function runDiagnostics(apiKey: string): Promise<{
  networkTest: ApiTestResult;
  apiKeyTest: ApiTestResult;
  recommendations: string[];
}> {
  console.log('开始运行综合诊断...');
  
  // 测试网络连接
  const networkTest = await testNetworkConnection();
  
  // 测试API密钥
  const apiKeyTest = await testApiKey(apiKey);
  
  // 生成建议
  const recommendations: string[] = [];
  
  if (!networkTest.success) {
    recommendations.push('检查网络连接，确保可以访问互联网');
    recommendations.push('如果使用代理，请确保代理设置正确');
  }
  
  if (!apiKeyTest.success) {
    if (apiKeyTest.details?.errorType === 'INVALID_API_KEY') {
      recommendations.push('检查API密钥是否正确复制，没有多余的空格');
      recommendations.push('确认API密钥来源：https://makersuite.google.com/app/apikey');
    } else if (apiKeyTest.details?.errorType === 'QUOTA_EXCEEDED') {
      recommendations.push('API配额已用完，请等待配额重置或升级计划');
    } else if (apiKeyTest.details?.errorType === 'NETWORK_ERROR') {
      recommendations.push('网络连接问题，请检查防火墙设置');
    }
  }
  
  if (networkTest.success && apiKeyTest.success) {
    recommendations.push('API密钥和网络连接都正常，可以正常使用');
  }
  
  return {
    networkTest,
    apiKeyTest,
    recommendations
  };
}