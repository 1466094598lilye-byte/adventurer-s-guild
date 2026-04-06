import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 清理超过7天的 DailyChest 记录
 * 
 * 安全机制：只删除当前用户自己创建的宝箱记录
 * 建议：每天运行一次
 */
Deno.serve(async (req) => {
  try {
    // 1. 创建 Base44 客户端并进行用户认证
    const base44 = createClientFromRequest(req);
    
    console.log('=== 开始清理旧的 DailyChest 记录 ===');
    console.log('执行时间:', new Date().toISOString());
    
    // 2. 验证用户身份
    let user;
    try {
      user = await base44.auth.me();
    } catch (error) {
      console.error('用户认证失败:', error.message);
      return Response.json({
        success: false,
        error: 'Unauthorized: Authentication required',
        message: '需要登录才能执行清理操作'
      }, { status: 401 });
    }
    
    console.log('✅ 用户认证通过:', user.email);
    
    // 3. 计算"7天前"的日期
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 格式化为 yyyy-MM-dd
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    console.log('📅 当前日期:', now.toISOString().split('T')[0]);
    console.log('📅 7天前日期:', sevenDaysAgoStr);
    console.log('🔍 将删除所有 date < ' + sevenDaysAgoStr + ' 的 DailyChest 记录');
    
    // 4. 查询需要删除的 DailyChest 记录（使用用户身份查询，自动遵守 RLS）
    console.log('');
    console.log('📊 查询符合条件的 DailyChest 记录...');
    
    let oldChests = [];
    try {
      // 使用用户身份查询（会自动只返回用户自己的记录）
      const allChests = await base44.entities.DailyChest.list();
      
      console.log('✅ 查询到用户的所有 DailyChest 记录数量:', allChests.length);
      
      // 在内存中过滤出超过7天的记录
      oldChests = allChests.filter(chest => {
        const chestDate = chest.date;
        
        // 必须有日期
        if (!chestDate) {
          return false;
        }
        
        // 检查是否超过7天
        return chestDate < sevenDaysAgoStr;
      });
      
      console.log('🎯 符合删除条件的记录数量:', oldChests.length);
      
      if (oldChests.length > 0) {
        console.log('');
        console.log('📋 需要删除的记录列表：');
        oldChests.forEach((chest, index) => {
          console.log(`  ${index + 1}. 日期: ${chest.date}, ID: ${chest.id}, 已开启: ${chest.opened ? '是' : '否'}`);
        });
      } else {
        console.log('✅ 没有找到需要删除的记录！');
        
        return Response.json({
          success: true,
          message: '没有找到需要删除的 DailyChest 记录',
          executedBy: user.email,
          executedAt: now.toISOString(),
          cutoffDate: sevenDaysAgoStr,
          stats: {
            chestsFound: 0,
            chestsDeleted: 0
          }
        });
      }
      
    } catch (error) {
      console.error('❌ 查询 DailyChest 失败:', error.message);
      throw new Error('查询 DailyChest 记录失败: ' + error.message);
    }
    
    // 5. 删除旧的 DailyChest 记录
    console.log('');
    console.log('📊 删除 DailyChest 记录...');
    
    let chestsDeleted = 0;
    const deletedChests = [];
    const failedChests = [];
    
    for (const chest of oldChests) {
      try {
        await base44.entities.DailyChest.delete(chest.id);
        chestsDeleted++;
        deletedChests.push({
          id: chest.id,
          date: chest.date,
          opened: chest.opened
        });
        console.log(`✅ 删除记录: ${chest.date} (ID: ${chest.id})`);
      } catch (error) {
        console.error(`❌ 删除记录失败 (${chest.date}):`, error.message);
        failedChests.push({
          id: chest.id,
          date: chest.date,
          error: error.message
        });
      }
    }
    
    console.log('');
    console.log('=== 清理完成 ===');
    console.log(`📊 记录删除成功: ${chestsDeleted}/${oldChests.length}`);
    
    // 6. 返回成功响应
    return Response.json({
      success: true,
      message: `成功删除 ${chestsDeleted} 条 DailyChest 记录`,
      executedBy: user.email,
      executedAt: now.toISOString(),
      cutoffDate: sevenDaysAgoStr,
      deletedChests,
      failedChests: failedChests.length > 0 ? failedChests : undefined,
      stats: {
        chestsFound: oldChests.length,
        chestsDeleted
      }
    });
    
  } catch (error) {
    console.error('❌ 清理操作执行失败:', error);
    return Response.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      message: '清理操作执行过程中发生错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});