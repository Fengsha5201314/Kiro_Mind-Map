/**
 * 日期格式化工具
 * 提供中文格式的日期时间格式化功能
 */

/**
 * 格式化日期为中文格式
 * @param timestamp 时间戳
 * @param includeTime 是否包含时间
 * @returns 中文格式的日期字符串
 */
export function formatDateToChinese(timestamp: number, includeTime: boolean = true): string {
  const date = new Date(timestamp);
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  let result = `${year}年${month}月${day}日`;
  
  if (includeTime) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    result += ` ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return result;
}

/**
 * 格式化相对时间为中文
 * @param timestamp 时间戳
 * @returns 中文格式的相对时间字符串
 */
export function formatRelativeTimeToChinese(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}分钟前`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}小时前`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days}天前`;
  } else if (diff < month) {
    const weeks = Math.floor(diff / week);
    return `${weeks}周前`;
  } else if (diff < year) {
    const months = Math.floor(diff / month);
    return `${months}个月前`;
  } else {
    const years = Math.floor(diff / year);
    return `${years}年前`;
  }
}

/**
 * 格式化时间段为中文
 * @param startTime 开始时间戳
 * @param endTime 结束时间戳
 * @returns 中文格式的时间段字符串
 */
export function formatTimeRangeToChinese(startTime: number, endTime: number): string {
  const startDate = formatDateToChinese(startTime);
  const endDate = formatDateToChinese(endTime);
  
  return `${startDate} 至 ${endDate}`;
}

/**
 * 格式化持续时间为中文
 * @param milliseconds 毫秒数
 * @returns 中文格式的持续时间字符串
 */
export function formatDurationToChinese(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}分钟${remainingSeconds}秒` : `${minutes}分钟`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 格式化文件大小为中文
 * @param bytes 字节数
 * @returns 中文格式的文件大小字符串
 */
export function formatFileSizeToChinese(bytes: number): string {
  if (bytes === 0) return '0 字节';
  
  const k = 1024;
  const sizes = ['字节', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${size} ${sizes[i]}`;
}

/**
 * 格式化数字为中文
 * @param num 数字
 * @returns 中文格式的数字字符串
 */
export function formatNumberToChinese(num: number): string {
  if (num < 10000) {
    return num.toString();
  } else if (num < 100000000) {
    const wan = Math.floor(num / 10000);
    const remainder = num % 10000;
    return remainder === 0 ? `${wan}万` : `${wan}万${remainder}`;
  } else {
    const yi = Math.floor(num / 100000000);
    const remainder = num % 100000000;
    if (remainder === 0) {
      return `${yi}亿`;
    } else if (remainder < 10000) {
      return `${yi}亿${remainder}`;
    } else {
      const wan = Math.floor(remainder / 10000);
      const final = remainder % 10000;
      return final === 0 ? `${yi}亿${wan}万` : `${yi}亿${wan}万${final}`;
    }
  }
}

/**
 * 格式化星期为中文
 * @param timestamp 时间戳
 * @returns 中文格式的星期字符串
 */
export function formatWeekdayToChinese(timestamp: number): string {
  const date = new Date(timestamp);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
}

/**
 * 格式化完整的中文日期时间
 * @param timestamp 时间戳
 * @param includeWeekday 是否包含星期
 * @returns 完整的中文日期时间字符串
 */
export function formatFullDateTimeToChinese(timestamp: number, includeWeekday: boolean = false): string {
  const basicFormat = formatDateToChinese(timestamp, true);
  
  if (includeWeekday) {
    const weekday = formatWeekdayToChinese(timestamp);
    return `${basicFormat} ${weekday}`;
  }
  
  return basicFormat;
}