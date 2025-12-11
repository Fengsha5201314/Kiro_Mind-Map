/**
 * 性能优化工具函数
 * 包含防抖、节流、requestAnimationFrame优化等功能
 */

// 防抖函数类型
export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

// 节流函数类型
export type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

/**
 * 防抖函数
 * 在指定延迟后执行函数，如果在延迟期间再次调用，则重新计时
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFunction = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(null, args);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  };

  // 取消防抖
  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  // 立即执行
  debouncedFunction.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func.apply(null, lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debouncedFunction;
}

/**
 * 节流函数
 * 在指定时间间隔内最多执行一次函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ThrottledFunction<T> {
  let lastExecTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttledFunction = (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastExecTime >= delay) {
      // 立即执行
      func.apply(null, args);
      lastExecTime = now;
      lastArgs = null;
    } else if (!timeoutId) {
      // 设置延迟执行
      const remainingTime = delay - (now - lastExecTime);
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func.apply(null, lastArgs);
          lastExecTime = Date.now();
          lastArgs = null;
        }
        timeoutId = null;
      }, remainingTime);
    }
  };

  // 取消节流
  throttledFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return throttledFunction;
}

/**
 * 使用requestAnimationFrame的节流函数
 * 适用于DOM操作和动画
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): ThrottledFunction<T> {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttledFunction = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(null, lastArgs);
          lastArgs = null;
        }
        rafId = null;
      });
    }
  };

  // 取消RAF节流
  throttledFunction.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastArgs = null;
    }
  };

  return throttledFunction;
}

/**
 * 批量处理函数
 * 将多个调用批量处理，减少执行次数
 */
export function batchProcess<T>(
  processor: (items: T[]) => void,
  delay: number = 16 // 默认一帧的时间
) {
  let batch: T[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const addToBatch = (item: T) => {
    batch.push(item);
    
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        if (batch.length > 0) {
          processor([...batch]);
          batch = [];
        }
        timeoutId = null;
      }, delay);
    }
  };

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (batch.length > 0) {
      processor([...batch]);
      batch = [];
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    batch = [];
  };

  return {
    add: addToBatch,
    flush,
    cancel,
    get size() {
      return batch.length;
    }
  };
}

/**
 * 智能防抖函数
 * 根据调用频率自动调整延迟时间
 */
export function smartDebounce<T extends (...args: any[]) => any>(
  func: T,
  minDelay: number = 100,
  maxDelay: number = 1000
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let callCount = 0;
  let lastCallTime = 0;

  const debouncedFunction = (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;
    callCount++;

    // 计算动态延迟
    const timeSinceLastCall = now - lastCallTime;
    const frequency = callCount / Math.max(timeSinceLastCall, 1000); // 每秒调用次数
    const dynamicDelay = Math.min(
      maxDelay,
      Math.max(minDelay, minDelay + frequency * 50)
    );

    lastCallTime = now;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(null, args);
      timeoutId = null;
      lastArgs = null;
      callCount = 0; // 重置计数
    }, dynamicDelay);
  };

  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
      callCount = 0;
    }
  };

  debouncedFunction.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func.apply(null, lastArgs);
      timeoutId = null;
      lastArgs = null;
      callCount = 0;
    }
  };

  return debouncedFunction;
}

/**
 * 性能监控装饰器
 * 监控函数执行时间
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  func: T,
  name: string = func.name || 'anonymous'
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = func.apply(null, args);
    const endTime = performance.now();
    
    if (endTime - startTime > 16) { // 超过一帧时间则警告
      console.warn(`性能警告: ${name} 执行耗时 ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

/**
 * 内存优化的事件监听器
 * 自动清理和防抖处理
 */
export class OptimizedEventListener {
  private listeners: Map<string, {
    element: EventTarget;
    event: string;
    handler: EventListener;
    options?: AddEventListenerOptions;
  }> = new Map();

  /**
   * 添加防抖事件监听器
   */
  addDebouncedListener(
    element: EventTarget,
    event: string,
    handler: EventListener,
    delay: number = 300,
    options?: AddEventListenerOptions
  ): string {
    const debouncedHandler = debounce(handler as any, delay);
    const id = `${event}_${Date.now()}_${Math.random()}`;
    
    element.addEventListener(event, debouncedHandler, options);
    
    this.listeners.set(id, {
      element,
      event,
      handler: debouncedHandler,
      options
    });
    
    return id;
  }

  /**
   * 添加节流事件监听器
   */
  addThrottledListener(
    element: EventTarget,
    event: string,
    handler: EventListener,
    delay: number = 100,
    options?: AddEventListenerOptions
  ): string {
    const throttledHandler = throttle(handler as any, delay);
    const id = `${event}_${Date.now()}_${Math.random()}`;
    
    element.addEventListener(event, throttledHandler, options);
    
    this.listeners.set(id, {
      element,
      event,
      handler: throttledHandler,
      options
    });
    
    return id;
  }

  /**
   * 添加RAF节流事件监听器
   */
  addRAFListener(
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): string {
    const rafHandler = rafThrottle(handler as any);
    const id = `${event}_${Date.now()}_${Math.random()}`;
    
    element.addEventListener(event, rafHandler, options);
    
    this.listeners.set(id, {
      element,
      event,
      handler: rafHandler,
      options
    });
    
    return id;
  }

  /**
   * 移除事件监听器
   */
  removeListener(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      this.listeners.delete(id);
    }
  }

  /**
   * 清理所有事件监听器
   */
  cleanup(): void {
    for (const [_id, listener] of this.listeners) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    }
    this.listeners.clear();
  }
}

// 导出单例实例
export const eventManager = new OptimizedEventListener();

export default {
  debounce,
  throttle,
  rafThrottle,
  batchProcess,
  smartDebounce,
  withPerformanceMonitoring,
  OptimizedEventListener,
  eventManager
};