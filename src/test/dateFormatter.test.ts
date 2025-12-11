/**
 * 日期格式化工具测试
 */

import { describe, it, expect } from 'vitest';
import {
  formatDateToChinese,
  formatRelativeTimeToChinese,
  formatTimeRangeToChinese,
  formatDurationToChinese,
  formatFileSizeToChinese,
  formatNumberToChinese,
  formatWeekdayToChinese,
  formatFullDateTimeToChinese
} from '../utils/dateFormatter';

describe('日期格式化工具', () => {
  describe('formatDateToChinese', () => {
    it('应该正确格式化日期（包含时间）', () => {
      const timestamp = new Date('2024-01-15 14:30:00').getTime();
      const result = formatDateToChinese(timestamp, true);
      expect(result).toBe('2024年1月15日 14:30');
    });

    it('应该正确格式化日期（不包含时间）', () => {
      const timestamp = new Date('2024-01-15 14:30:00').getTime();
      const result = formatDateToChinese(timestamp, false);
      expect(result).toBe('2024年1月15日');
    });

    it('应该正确处理个位数的月份和日期', () => {
      const timestamp = new Date('2024-03-05 09:05:00').getTime();
      const result = formatDateToChinese(timestamp, true);
      expect(result).toBe('2024年3月5日 09:05');
    });
  });

  describe('formatRelativeTimeToChinese', () => {
    const now = Date.now();

    it('应该显示"刚刚"', () => {
      const timestamp = now - 30 * 1000; // 30秒前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('刚刚');
    });

    it('应该显示分钟前', () => {
      const timestamp = now - 5 * 60 * 1000; // 5分钟前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('5分钟前');
    });

    it('应该显示小时前', () => {
      const timestamp = now - 3 * 60 * 60 * 1000; // 3小时前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('3小时前');
    });

    it('应该显示天前', () => {
      const timestamp = now - 2 * 24 * 60 * 60 * 1000; // 2天前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('2天前');
    });

    it('应该显示周前', () => {
      const timestamp = now - 2 * 7 * 24 * 60 * 60 * 1000; // 2周前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('2周前');
    });

    it('应该显示月前', () => {
      const timestamp = now - 3 * 30 * 24 * 60 * 60 * 1000; // 3个月前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('3个月前');
    });

    it('应该显示年前', () => {
      const timestamp = now - 2 * 365 * 24 * 60 * 60 * 1000; // 2年前
      const result = formatRelativeTimeToChinese(timestamp);
      expect(result).toBe('2年前');
    });
  });

  describe('formatDurationToChinese', () => {
    it('应该格式化秒', () => {
      const result = formatDurationToChinese(30 * 1000);
      expect(result).toBe('30秒');
    });

    it('应该格式化分钟和秒', () => {
      const result = formatDurationToChinese(90 * 1000);
      expect(result).toBe('1分钟30秒');
    });

    it('应该格式化小时和分钟', () => {
      const result = formatDurationToChinese(90 * 60 * 1000);
      expect(result).toBe('1小时30分钟');
    });

    it('应该格式化天和小时', () => {
      const result = formatDurationToChinese(26 * 60 * 60 * 1000);
      expect(result).toBe('1天2小时');
    });

    it('应该格式化整数天', () => {
      const result = formatDurationToChinese(24 * 60 * 60 * 1000);
      expect(result).toBe('1天');
    });
  });

  describe('formatFileSizeToChinese', () => {
    it('应该格式化字节', () => {
      const result = formatFileSizeToChinese(512);
      expect(result).toBe('512 字节');
    });

    it('应该格式化KB', () => {
      const result = formatFileSizeToChinese(1536);
      expect(result).toBe('1.5 KB');
    });

    it('应该格式化MB', () => {
      const result = formatFileSizeToChinese(2.5 * 1024 * 1024);
      expect(result).toBe('2.5 MB');
    });

    it('应该格式化GB', () => {
      const result = formatFileSizeToChinese(1.2 * 1024 * 1024 * 1024);
      expect(result).toBe('1.2 GB');
    });

    it('应该处理0字节', () => {
      const result = formatFileSizeToChinese(0);
      expect(result).toBe('0 字节');
    });
  });

  describe('formatNumberToChinese', () => {
    it('应该格式化小于万的数字', () => {
      const result = formatNumberToChinese(9999);
      expect(result).toBe('9999');
    });

    it('应该格式化万', () => {
      const result = formatNumberToChinese(50000);
      expect(result).toBe('5万');
    });

    it('应该格式化万和个位', () => {
      const result = formatNumberToChinese(50123);
      expect(result).toBe('5万123');
    });

    it('应该格式化亿', () => {
      const result = formatNumberToChinese(200000000);
      expect(result).toBe('2亿');
    });

    it('应该格式化亿万', () => {
      const result = formatNumberToChinese(123450000);
      expect(result).toBe('1亿2345万');
    });

    it('应该格式化复杂数字', () => {
      const result = formatNumberToChinese(123456789);
      expect(result).toBe('1亿2345万6789');
    });
  });

  describe('formatWeekdayToChinese', () => {
    it('应该正确格式化星期日', () => {
      const timestamp = new Date('2024-01-14').getTime(); // 星期日
      const result = formatWeekdayToChinese(timestamp);
      expect(result).toBe('星期日');
    });

    it('应该正确格式化星期一', () => {
      const timestamp = new Date('2024-01-15').getTime(); // 星期一
      const result = formatWeekdayToChinese(timestamp);
      expect(result).toBe('星期一');
    });

    it('应该正确格式化星期六', () => {
      const timestamp = new Date('2024-01-13').getTime(); // 星期六
      const result = formatWeekdayToChinese(timestamp);
      expect(result).toBe('星期六');
    });
  });

  describe('formatFullDateTimeToChinese', () => {
    it('应该格式化完整日期时间（不包含星期）', () => {
      const timestamp = new Date('2024-01-15 14:30:00').getTime();
      const result = formatFullDateTimeToChinese(timestamp, false);
      expect(result).toBe('2024年1月15日 14:30');
    });

    it('应该格式化完整日期时间（包含星期）', () => {
      const timestamp = new Date('2024-01-15 14:30:00').getTime(); // 星期一
      const result = formatFullDateTimeToChinese(timestamp, true);
      expect(result).toBe('2024年1月15日 14:30 星期一');
    });
  });

  describe('formatTimeRangeToChinese', () => {
    it('应该格式化时间范围', () => {
      const startTime = new Date('2024-01-15 09:00:00').getTime();
      const endTime = new Date('2024-01-15 17:30:00').getTime();
      const result = formatTimeRangeToChinese(startTime, endTime);
      expect(result).toBe('2024年1月15日 09:00 至 2024年1月15日 17:30');
    });
  });
});