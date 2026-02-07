import { format, isSameDay, differenceInDays, subDays, parseISO } from 'date-fns';

/**
 * 标准化日期为 YYYY-MM-DD 格式
 * @param {Date|string|null} date - 日期对象、ISO字符串或 YYYY-MM-DD 字符串
 * @returns {string|null} YYYY-MM-DD 格式的日期字符串，如果输入无效则返回 null
 */
export function normalizeDate(date) {
  if (!date) return null;
  
  try {
    // 如果已经是 YYYY-MM-DD 格式的字符串，直接返回
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // 如果是 ISO 字符串或其他格式，先解析
    if (typeof date === 'string') {
      return format(parseISO(date), 'yyyy-MM-dd');
    }
    
    // 如果是 Date 对象
    if (date instanceof Date && !isNaN(date.getTime())) {
      return format(date, 'yyyy-MM-dd');
    }
    
    return null;
  } catch (error) {
    console.error('normalizeDate 错误:', error, '输入:', date);
    return null;
  }
}

/**
 * 精确比较两个日期是否同一天（忽略时区和时间部分）
 * @param {Date|string|null} date1 - 第一个日期
 * @param {Date|string|null} date2 - 第二个日期
 * @returns {boolean} 如果是同一天返回 true，否则返回 false
 */
export function isSameDate(date1, date2) {
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
}

/**
 * 计算两个日期之间相隔的天数（绝对值）
 * @param {Date|string} date1 - 第一个日期
 * @param {Date|string} date2 - 第二个日期
 * @returns {number} 相隔的天数（绝对值），如果日期无效返回 -1
 */
export function getDaysBetween(date1, date2) {
  try {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    
    if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return -1;
    }
    
    return Math.abs(differenceInDays(d1, d2));
  } catch (error) {
    console.error('getDaysBetween 错误:', error);
    return -1;
  }
}

/**
 * 获取指定日期的上一个工作日（跳过休息日）
 * @param {Date|string} date - 起始日期
 * @param {string[]} restDays - 休息日列表（YYYY-MM-DD 格式）
 * @param {number} maxDaysBack - 最多往前查找的天数（默认365天）
 * @returns {string|null} 上一个工作日的 YYYY-MM-DD 字符串，如果找不到返回 null
 */
export function getPreviousWorkday(date, restDays = [], maxDaysBack = 365) {
  try {
    const startDate = typeof date === 'string' ? parseISO(date) : date;
    if (!startDate || isNaN(startDate.getTime())) {
      return null;
    }
    
    // 标准化休息日列表
    const normalizedRestDays = restDays.map(d => normalizeDate(d)).filter(Boolean);
    
    // 从前一天开始往前找
    let checkDate = subDays(startDate, 1);
    let daysChecked = 0;
    
    while (daysChecked < maxDaysBack) {
      const checkDateStr = format(checkDate, 'yyyy-MM-dd');
      
      // 如果不是休息日，找到了
      if (!normalizedRestDays.includes(checkDateStr)) {
        return checkDateStr;
      }
      
      // 继续往前找
      checkDate = subDays(checkDate, 1);
      daysChecked++;
    }
    
    // 超过最大查找天数，返回 null
    return null;
  } catch (error) {
    console.error('getPreviousWorkday 错误:', error);
    return null;
  }
}