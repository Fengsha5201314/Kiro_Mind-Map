// 测试环境设置文件
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as fc from 'fast-check'
import { createMockLocalStorage, createMockIndexedDB } from './testUtils'

// 配置fast-check全局设置
fc.configureGlobal({
  numRuns: 100,
  verbose: true,
  seed: 42
})

// 每个测试前设置模拟环境
beforeEach(() => {
  // 模拟localStorage
  if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
    Object.defineProperty(window, 'localStorage', {
      value: createMockLocalStorage(),
      writable: true,
      configurable: true
    })
  } else {
    // 清空现有的localStorage
    window.localStorage.clear()
  }
  
  // 模拟indexedDB
  try {
    Object.defineProperty(window, 'indexedDB', {
      value: createMockIndexedDB(),
      writable: true,
      configurable: true
    })
  } catch {
    // 如果属性已存在且不可配置，尝试直接赋值
    try {
      delete (window as any).indexedDB
      Object.defineProperty(window, 'indexedDB', {
        value: createMockIndexedDB(),
        writable: true,
        configurable: true
      })
    } catch {
      // 最后的备选方案：使用全局变量
      (globalThis as any).indexedDB = createMockIndexedDB()
    }
  }
  
  // 模拟crypto API
  if (!window.crypto || !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256)
          }
          return arr
        },
        subtle: {
          importKey: (format: string, keyData: any, algorithm: any, extractable: boolean, usages: string[]) => {
            return Promise.resolve({
              type: 'secret',
              extractable,
              algorithm,
              usages
            })
          },
          deriveKey: (algorithm: any, baseKey: any, derivedKeyType: any, extractable: boolean, usages: string[]) => {
            return Promise.resolve({
              type: 'secret',
              extractable,
              algorithm: derivedKeyType,
              usages
            })
          },
          encrypt: (algorithm: any, key: any, data: ArrayBuffer) => {
            // 简单的测试加密：只是返回原数据加上一些标识
            const view = new Uint8Array(data)
            const encrypted = new Uint8Array(view.length + 16) // 加16字节作为"加密"标识
            encrypted.set(view)
            encrypted.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], view.length)
            return Promise.resolve(encrypted.buffer)
          },
          decrypt: (algorithm: any, key: any, data: ArrayBuffer) => {
            // 简单的测试解密：移除最后16字节
            const view = new Uint8Array(data)
            if (view.length < 16) return Promise.resolve(new ArrayBuffer(0))
            const decrypted = new Uint8Array(view.length - 16)
            decrypted.set(view.slice(0, -16))
            return Promise.resolve(decrypted.buffer)
          },
          digest: (algorithm: string, data: ArrayBuffer) => {
            // 简单的哈希模拟
            const view = new Uint8Array(data)
            const hash = new Uint8Array(32) // SHA-256 输出32字节
            for (let i = 0; i < hash.length; i++) {
              hash[i] = (view[i % view.length] + i) % 256
            }
            return Promise.resolve(hash.buffer)
          }
        }
      },
      writable: true,
      configurable: true
    })
  }
})

// 每个测试后清理
afterEach(() => {
  cleanup()
})