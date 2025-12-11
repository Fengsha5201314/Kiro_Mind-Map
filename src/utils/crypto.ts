/**
 * 加密/解密工具
 * 用于安全存储敏感数据如API密钥
 */

// 加密配置常量
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM' as const,
  keyLength: 256,
  ivLength: 12,
  saltLength: 16,
  iterations: 100000,
} as const;

// 错误类型
export class CryptoError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * 生成随机字节数组
 * @param length 字节长度
 * @returns 随机字节数组
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * 从密码派生加密密钥
 * @param password 密码字符串
 * @param salt 盐值
 * @returns 派生的密钥
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  try {
    // 将密码转换为密钥材料
    const passwordBuffer = new TextEncoder().encode(password);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // 使用PBKDF2派生密钥
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: ENCRYPTION_CONFIG.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError('密钥派生失败', 'KEY_DERIVATION_FAILED');
  }
}

/**
 * 生成用于加密的固定密码
 * 基于浏览器指纹和固定字符串生成
 * @returns 固定密码字符串
 */
function generateFixedPassword(): string {
  // 使用浏览器特征生成固定密码
  const browserFingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // 添加固定盐值确保一致性
  const fixedSalt = 'mindmap-generator-2024';
  const combined = browserFingerprint + fixedSalt;
  
  // 使用TextEncoder处理Unicode字符，避免btoa的InvalidCharacterError
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  
  // 将Uint8Array转换为base64安全的字符串
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * 加密文本数据
 * @param plaintext 明文字符串
 * @returns 加密后的base64字符串
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    // 生成盐值和初始化向量
    const salt = generateRandomBytes(ENCRYPTION_CONFIG.saltLength);
    const iv = generateRandomBytes(ENCRYPTION_CONFIG.ivLength);
    
    // 派生加密密钥
    const password = generateFixedPassword();
    const key = await deriveKey(password, salt);
    
    // 加密数据
    const plaintextBuffer = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv as BufferSource,
      },
      key,
      plaintextBuffer
    );
    
    // 组合盐值、IV和加密数据
    const combinedBuffer = new Uint8Array(
      salt.length + iv.length + encryptedBuffer.byteLength
    );
    combinedBuffer.set(salt, 0);
    combinedBuffer.set(iv, salt.length);
    combinedBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    // 转换为base64字符串（combinedBuffer是Uint8Array，不会有Unicode问题）
    let binary = '';
    for (let i = 0; i < combinedBuffer.length; i++) {
      binary += String.fromCharCode(combinedBuffer[i]);
    }
    return btoa(binary);
  } catch (error) {
    throw new CryptoError('数据加密失败', 'ENCRYPTION_FAILED');
  }
}

/**
 * 解密文本数据
 * @param encryptedData 加密的base64字符串
 * @returns 解密后的明文字符串
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    // 解析base64数据
    const combinedBuffer = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // 提取盐值、IV和加密数据
    const salt = combinedBuffer.slice(0, ENCRYPTION_CONFIG.saltLength);
    const iv = combinedBuffer.slice(
      ENCRYPTION_CONFIG.saltLength,
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength
    );
    const encryptedBuffer = combinedBuffer.slice(
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength
    );
    
    // 派生解密密钥
    const password = generateFixedPassword();
    const key = await deriveKey(password, salt);
    
    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv as BufferSource,
      },
      key,
      encryptedBuffer
    );
    
    // 转换为字符串
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    throw new CryptoError('数据解密失败', 'DECRYPTION_FAILED');
  }
}

/**
 * 验证加密数据的完整性
 * @param encryptedData 加密的base64字符串
 * @returns 是否有效
 */
export function validateEncryptedData(encryptedData: string): boolean {
  try {
    // 检查是否为有效的base64字符串
    const decoded = atob(encryptedData);
    const minLength = ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + 1;
    
    return decoded.length >= minLength;
  } catch {
    return false;
  }
}

/**
 * 生成安全的随机ID
 * @param length ID长度（默认16字符）
 * @returns 随机ID字符串
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = generateRandomBytes(length);
  
  return Array.from(randomBytes)
    .map(byte => chars[byte % chars.length])
    .join('');
}

/**
 * 计算数据的哈希值（用于完整性验证）
 * @param data 要计算哈希的数据
 * @returns 哈希值的十六进制字符串
 */
export async function calculateHash(data: string): Promise<string> {
  try {
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = new Uint8Array(hashBuffer);
    
    return Array.from(hashArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    throw new CryptoError('哈希计算失败', 'HASH_CALCULATION_FAILED');
  }
}