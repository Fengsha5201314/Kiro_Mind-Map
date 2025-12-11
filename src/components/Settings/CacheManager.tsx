/**
 * 缓存管理组件
 * 显示缓存统计信息并提供缓存管理功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../Common';
import { 
 
  fileCacheService, 
  apiCacheService,
  CacheStats 
} from '../../services/cacheService';

// 缓存管理器属性
export interface CacheManagerProps {
  // 是否显示详细统计
  showDetailedStats?: boolean;
  // 自定义样式类名
  className?: string;
}

/**
 * 缓存管理组件
 */
const CacheManager: React.FC<CacheManagerProps> = ({
  showDetailedStats = true,
  className = ''
}) => {
  const [fileStats, setFileStats] = useState<CacheStats | null>(null);
  const [apiStats, setApiStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 更新缓存统计
  const updateStats = useCallback(() => {
    setFileStats(fileCacheService.getStats());
    setApiStats(apiCacheService.getStats());
  }, []);

  // 组件挂载时更新统计
  useEffect(() => {
    updateStats();
    
    // 定期更新统计信息
    const interval = setInterval(updateStats, 5000); // 每5秒更新一次
    
    return () => clearInterval(interval);
  }, [updateStats]);

  // 格式化文件大小
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 格式化命中率
  const formatHitRate = useCallback((rate: number): string => {
    return (rate * 100).toFixed(1) + '%';
  }, []);

  // 清空文件缓存
  const clearFileCache = useCallback(async () => {
    setIsLoading(true);
    try {
      fileCacheService.clear();
      updateStats();
      console.log('文件缓存已清空');
    } catch (error) {
      console.error('清空文件缓存失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  // 清空API缓存
  const clearAPICache = useCallback(async () => {
    setIsLoading(true);
    try {
      apiCacheService.clear();
      updateStats();
      console.log('API缓存已清空');
    } catch (error) {
      console.error('清空API缓存失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  // 清空所有缓存
  const clearAllCache = useCallback(async () => {
    setIsLoading(true);
    try {
      fileCacheService.clear();
      apiCacheService.clear();
      updateStats();
      console.log('所有缓存已清空');
    } catch (error) {
      console.error('清空缓存失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  // 渲染缓存统计卡片
  const renderStatsCard = (title: string, stats: CacheStats | null, color: string) => {
    if (!stats) {
      return (
        <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${color}`}>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
          <div className="text-gray-500">加载中...</div>
        </div>
      );
    }

    return (
      <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${color}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
        
        {/* 基本统计 */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-sm text-gray-600">缓存项数</div>
            <div className="text-xl font-bold text-gray-800">{stats.totalItems}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">总大小</div>
            <div className="text-xl font-bold text-gray-800">{formatSize(stats.totalSize)}</div>
          </div>
        </div>

        {/* 命中率 */}
        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-1">命中率</div>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.hitRate * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm font-semibold text-gray-700">
              {formatHitRate(stats.hitRate)}
            </div>
          </div>
        </div>

        {/* 详细统计 */}
        {showDetailedStats && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>命中次数: {stats.hitCount}</div>
            <div>未命中次数: {stats.missCount}</div>
            <div>清理次数: {stats.evictionCount}</div>
            <div>上次清理: {new Date(stats.lastCleanup).toLocaleString()}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">缓存管理</h2>
        <Button
          onClick={updateStats}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          刷新统计
        </Button>
      </div>

      {/* 缓存统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderStatsCard('文件缓存', fileStats, 'border-blue-500')}
        {renderStatsCard('API缓存', apiStats, 'border-green-500')}
      </div>

      {/* 缓存操作按钮 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">缓存操作</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            onClick={clearFileCache}
            variant="outline"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '清理中...' : '清空文件缓存'}
          </Button>
          
          <Button
            onClick={clearAPICache}
            variant="outline"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '清理中...' : '清空API缓存'}
          </Button>
          
          <Button
            onClick={clearAllCache}
            variant="danger"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '清理中...' : '清空所有缓存'}
          </Button>
        </div>

        {/* 缓存说明 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">缓存说明</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 文件缓存：存储已解析的文件内容，避免重复解析</li>
            <li>• API缓存：存储AI生成结果，减少API调用次数</li>
            <li>• 缓存会自动过期和清理，无需手动管理</li>
            <li>• 清空缓存后下次操作可能会稍慢</li>
          </ul>
        </div>
      </div>

      {/* 性能建议 */}
      {(fileStats || apiStats) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">性能建议</h4>
          <div className="text-xs text-yellow-700 space-y-1">
            {fileStats && fileStats.hitRate < 0.5 && (
              <div>• 文件缓存命中率较低，考虑增加缓存时间</div>
            )}
            {apiStats && apiStats.hitRate < 0.3 && (
              <div>• API缓存命中率较低，可能需要优化缓存策略</div>
            )}
            {fileStats && fileStats.totalSize > 20 * 1024 * 1024 && (
              <div>• 文件缓存占用较多内存，建议定期清理</div>
            )}
            {apiStats && apiStats.totalSize > 10 * 1024 * 1024 && (
              <div>• API缓存占用较多内存，建议定期清理</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheManager;