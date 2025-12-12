// 访客模式本地数据管理模块
// 用于在用户未登录时，将数据保存在浏览器的 localStorage 中

const GUEST_DATA_PREFIX = 'adventurer_guest_';

/**
 * 从 localStorage 读取指定 key 的数据
 * @param {string} key - 数据键名（如 'quests', 'loot'）
 * @returns {Array} 返回数据数组，如果不存在或解析失败则返回空数组
 */
export function getGuestData(key) {
  try {
    const fullKey = GUEST_DATA_PREFIX + key;
    const data = localStorage.getItem(fullKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to get guest data for key: ${key}`, error);
    return [];
  }
}

/**
 * 将数据写入 localStorage
 * @param {string} key - 数据键名
 * @param {Array} data - 要保存的数据数组
 */
export function setGuestData(key, data) {
  try {
    const fullKey = GUEST_DATA_PREFIX + key;
    localStorage.setItem(fullKey, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to set guest data for key: ${key}`, error);
  }
}

/**
 * 生成唯一 ID（模拟后端生成的 ID）
 * @returns {string} 唯一标识符
 */
function generateId() {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 添加新实体到指定集合
 * @param {string} key - 数据键名
 * @param {Object} entity - 要添加的实体对象
 * @returns {Object} 返回添加后的实体（包含 id, created_date 等）
 */
export function addGuestEntity(key, entity) {
  try {
    const existingData = getGuestData(key);
    const now = new Date().toISOString();
    
    const newEntity = {
      ...entity,
      id: generateId(),
      created_date: now,
      updated_date: now,
      created_by: 'guest'
    };
    
    existingData.push(newEntity);
    setGuestData(key, existingData);
    
    return newEntity;
  } catch (error) {
    console.error(`Failed to add guest entity for key: ${key}`, error);
    throw error;
  }
}

/**
 * 更新指定 ID 的实体
 * @param {string} key - 数据键名
 * @param {string} id - 实体 ID
 * @param {Object} newData - 要更新的数据
 * @returns {Object|null} 返回更新后的实体，如果未找到则返回 null
 */
export function updateGuestEntity(key, id, newData) {
  try {
    const existingData = getGuestData(key);
    const index = existingData.findIndex(item => item.id === id);
    
    if (index === -1) {
      console.warn(`Entity with id ${id} not found in ${key}`);
      return null;
    }
    
    existingData[index] = {
      ...existingData[index],
      ...newData,
      updated_date: new Date().toISOString()
    };
    
    setGuestData(key, existingData);
    
    return existingData[index];
  } catch (error) {
    console.error(`Failed to update guest entity for key: ${key}, id: ${id}`, error);
    throw error;
  }
}

/**
 * 删除指定 ID 的实体
 * @param {string} key - 数据键名
 * @param {string} id - 实体 ID
 * @returns {boolean} 成功返回 true，失败返回 false
 */
export function deleteGuestEntity(key, id) {
  try {
    const existingData = getGuestData(key);
    const filteredData = existingData.filter(item => item.id !== id);
    
    if (filteredData.length === existingData.length) {
      console.warn(`Entity with id ${id} not found in ${key}`);
      return false;
    }
    
    setGuestData(key, filteredData);
    return true;
  } catch (error) {
    console.error(`Failed to delete guest entity for key: ${key}, id: ${id}`, error);
    return false;
  }
}

/**
 * 清空所有访客模式数据
 */
export function clearAllGuestData() {
  try {
    const keysToRemove = [];
    
    // 遍历 localStorage，找到所有以前缀开头的键
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(GUEST_DATA_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // 删除所有找到的键
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('All guest data cleared');
  } catch (error) {
    console.error('Failed to clear all guest data', error);
  }
}