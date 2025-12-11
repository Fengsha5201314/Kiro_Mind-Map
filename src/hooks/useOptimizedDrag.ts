/**
 * 优化的拖拽Hook
 * 使用requestAnimationFrame优化拖拽性能
 */

import { useCallback, useRef, useEffect } from 'react';
import { rafThrottle } from '../utils/performance';

// 拖拽配置
export interface DragConfig {
  // 是否启用RAF优化
  useRAF: boolean;
  // 拖拽阈值（像素）
  threshold: number;
  // 是否启用惯性滚动
  enableInertia: boolean;
  // 惯性衰减系数
  inertiaDecay: number;
}

// 拖拽状态
export interface DragState {
  isDragging: boolean;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  delta: { x: number; y: number };
  velocity: { x: number; y: number };
}

// 拖拽事件处理器
export interface DragHandlers {
  onDragStart?: (state: DragState, event: MouseEvent | TouchEvent) => void;
  onDrag?: (state: DragState, event: MouseEvent | TouchEvent) => void;
  onDragEnd?: (state: DragState, event: MouseEvent | TouchEvent) => void;
}

// 默认配置
const DEFAULT_CONFIG: DragConfig = {
  useRAF: true,
  threshold: 5,
  enableInertia: false,
  inertiaDecay: 0.95
};

/**
 * 优化的拖拽Hook
 */
export function useOptimizedDrag(
  handlers: DragHandlers = {},
  config: Partial<DragConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const stateRef = useRef<DragState>({
    isDragging: false,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
  });

  const lastPositionRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const inertiaRafIdRef = useRef<number | null>(null);

  // 获取事件坐标
  const getEventCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    if ('touches' in event && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
  }, []);

  // 计算速度
  const calculateVelocity = useCallback((
    currentPos: { x: number; y: number },
    currentTime: number
  ) => {
    const deltaTime = currentTime - lastTimeRef.current;
    if (deltaTime === 0) return { x: 0, y: 0 };

    const deltaX = currentPos.x - lastPositionRef.current.x;
    const deltaY = currentPos.y - lastPositionRef.current.y;

    return {
      x: deltaX / deltaTime,
      y: deltaY / deltaTime
    };
  }, []);

  // RAF优化的拖拽处理
  const optimizedDragHandler = useCallback(
    rafThrottle((event: MouseEvent | TouchEvent) => {
      const currentPos = getEventCoordinates(event);
      const currentTime = performance.now();
      
      const velocity = calculateVelocity(currentPos, currentTime);
      
      stateRef.current = {
        ...stateRef.current,
        currentPosition: currentPos,
        delta: {
          x: currentPos.x - stateRef.current.startPosition.x,
          y: currentPos.y - stateRef.current.startPosition.y
        },
        velocity
      };

      lastPositionRef.current = currentPos;
      lastTimeRef.current = currentTime;

      handlers.onDrag?.(stateRef.current, event);
    }),
    []
  );

  // 普通拖拽处理
  const normalDragHandler = useCallback((event: MouseEvent | TouchEvent) => {
    const currentPos = getEventCoordinates(event);
    const currentTime = performance.now();
    
    const velocity = calculateVelocity(currentPos, currentTime);
    
    stateRef.current = {
      ...stateRef.current,
      currentPosition: currentPos,
      delta: {
        x: currentPos.x - stateRef.current.startPosition.x,
        y: currentPos.y - stateRef.current.startPosition.y
      },
      velocity
    };

    lastPositionRef.current = currentPos;
    lastTimeRef.current = currentTime;

    handlers.onDrag?.(stateRef.current, event);
  }, [getEventCoordinates, calculateVelocity, handlers.onDrag]);

  // 惯性滚动
  const startInertia = useCallback(() => {
    if (!finalConfig.enableInertia) return;

    const animate = () => {
      const { velocity } = stateRef.current;
      
      // 速度衰减
      const newVelocity = {
        x: velocity.x * finalConfig.inertiaDecay,
        y: velocity.y * finalConfig.inertiaDecay
      };

      // 如果速度太小，停止动画
      if (Math.abs(newVelocity.x) < 0.1 && Math.abs(newVelocity.y) < 0.1) {
        inertiaRafIdRef.current = null;
        return;
      }

      // 更新位置
      stateRef.current = {
        ...stateRef.current,
        currentPosition: {
          x: stateRef.current.currentPosition.x + newVelocity.x,
          y: stateRef.current.currentPosition.y + newVelocity.y
        },
        velocity: newVelocity
      };

      // 触发拖拽事件
      handlers.onDrag?.(stateRef.current, new MouseEvent('mousemove'));

      inertiaRafIdRef.current = requestAnimationFrame(animate);
    };

    inertiaRafIdRef.current = requestAnimationFrame(animate);
  }, [finalConfig.enableInertia, finalConfig.inertiaDecay, handlers.onDrag]);

  // 开始拖拽
  const handleDragStart = useCallback((event: MouseEvent | TouchEvent) => {
    const startPos = getEventCoordinates(event);
    const currentTime = performance.now();

    stateRef.current = {
      isDragging: true,
      startPosition: startPos,
      currentPosition: startPos,
      delta: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    };

    lastPositionRef.current = startPos;
    lastTimeRef.current = currentTime;

    // 取消之前的惯性动画
    if (inertiaRafIdRef.current) {
      cancelAnimationFrame(inertiaRafIdRef.current);
      inertiaRafIdRef.current = null;
    }

    handlers.onDragStart?.(stateRef.current, event);

    // 添加全局事件监听器
    const dragHandler = finalConfig.useRAF ? optimizedDragHandler : normalDragHandler;
    
    const handleMouseMove = (e: MouseEvent) => dragHandler(e);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // 防止页面滚动
      dragHandler(e);
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      stateRef.current = {
        ...stateRef.current,
        isDragging: false
      };

      // 清理事件监听器
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);

      // 取消RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      handlers.onDragEnd?.(stateRef.current, e);

      // 启动惯性滚动
      if (finalConfig.enableInertia) {
        startInertia();
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleEnd, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd, { passive: false });
  }, [
    getEventCoordinates,
    handlers.onDragStart,
    handlers.onDragEnd,
    optimizedDragHandler,
    normalDragHandler,
    finalConfig.useRAF,
    finalConfig.enableInertia,
    startInertia
  ]);

  // 检查是否超过拖拽阈值
  const checkThreshold = useCallback((event: MouseEvent | TouchEvent) => {
    const currentPos = getEventCoordinates(event);
    const deltaX = Math.abs(currentPos.x - stateRef.current.startPosition.x);
    const deltaY = Math.abs(currentPos.y - stateRef.current.startPosition.y);
    
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY) >= finalConfig.threshold;
  }, [getEventCoordinates, finalConfig.threshold]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (inertiaRafIdRef.current) {
        cancelAnimationFrame(inertiaRafIdRef.current);
      }
    };
  }, []);

  return {
    isDragging: stateRef.current.isDragging,
    dragState: stateRef.current,
    handleDragStart,
    checkThreshold,
    // 手动控制方法
    startDrag: handleDragStart,
    stopInertia: () => {
      if (inertiaRafIdRef.current) {
        cancelAnimationFrame(inertiaRafIdRef.current);
        inertiaRafIdRef.current = null;
      }
    }
  };
}

export default useOptimizedDrag;