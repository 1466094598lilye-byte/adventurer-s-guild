import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 清理超过7天且标记为已完成的Quest记录
 * 
 * 安全机制：
 * - 只删除当前用户自己创建的Quest
 * - 保护每个routine任务的最新已完成版本作为模板
 * - 保护所有长期项目任务
 * 
 * 建议：每天运行一次
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('=== 开始清理已完成的Quest记录 ===');
    console.log('执行时间:', new Date().toISOString());
    
    // 验证用户身份
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
    
    // 计算"7天前"的时间
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const cutoffTime = sevenDaysAgo.toISOString();
    
    console.log('📅 当前时间:', now.toISOString());
    console.log('📅 7天前:', cutoffTime);
    console.log('🔍 将删除所有 status=done 且 updated_date < ' + cutoffTime + ' 的Quest');
    
    // 查询需要删除的Quest（使用用户身份查询，自动遵守RLS）
    console.log('');
    console.log('📊 查询符合条件的Quest记录...');
    
    let oldQuests = [];
    try {
      let allQuests = await base44.entities.Quest.list();
      
      console.log('✅ 查询到用户的所有Quest数量（加密状态）:', allQuests.length);
      
      // 🔓 解密所有Quest数据
      if (allQuests.length > 0) {
        try {
          console.log('🔐 开始解密Quest数据，样本:', {
            hasEncryptedDate: !!allQuests[0].encryptedDate,
            hasEncryptedTitle: !!allQuests[0].encryptedTitle,
            rawDate: allQuests[0].date
          });
          
          const { data: decryptResponse } = await base44.asServiceRole.functions.invoke('decryptQuestData', {
            encryptedQuests: allQuests
          });
          
          console.log('🔓 解密响应:', {
            hasDecryptedQuests: !!decryptResponse?.decryptedQuests,
            length: decryptResponse?.decryptedQuests?.length,
            sampleDecrypted: decryptResponse?.decryptedQuests?.[0]
          });
          
          if (decryptResponse?.decryptedQuests && Array.isArray(decryptResponse.decryptedQuests)) {
            // 合并解密后的字段到原始Quest对象
            allQuests = allQuests.map((quest, index) => ({
              ...quest,
              ...decryptResponse.decryptedQuests[index]
            }));
            console.log('✅ Quest数据解密成功，样本日期:', allQuests[0].date);
          }
        } catch (error) {
          console.error('⚠️ Quest解密失败，使用原始数据:', error.message);
        }
      }
      
      console.log('✅ 当前处理的Quest数量:', allQuests.length);
      
      // 🔍 诊断日志：统计任务状态
      const statusCounts = {
        done: allQuests.filter(q => q.status === 'done').length,
        todo: allQuests.filter(q => q.status === 'todo').length,
        skipped: allQuests.filter(q => q.status === 'skipped').length
      };
      console.log(`📊 任务状态统计: done=${statusCounts.done}, todo=${statusCounts.todo}, skipped=${statusCounts.skipped}`);
      
      // 🔍 诊断日志：统计日期范围
      const doneQuests = allQuests.filter(q => q.status === 'done' && q.date);
      if (doneQuests.length > 0) {
        const dates = doneQuests.map(q => q.date).sort();
        console.log(`📅 已完成任务日期范围: ${dates[0]} ~ ${dates[dates.length - 1]}`);
        console.log(`🕐 7天前的日期: ${sevenDaysAgo.toISOString().split('T')[0]}`);
        
        const oldDoneQuests = doneQuests.filter(q => {
          const questDate = new Date(q.date + 'T00:00:00Z');
          return questDate < sevenDaysAgo;
        });
        console.log(`🗓️ 超过7天的已完成任务数量: ${oldDoneQuests.length}`);
      }
      
      // 🔥 步骤1: 识别需要保护的 routine 模板（每个 originalActionHint 最新的已完成任务）
      const routineTemplateIds = new Set();
      const routineQuestsMap = new Map();
      
      for (const quest of allQuests) {
        if (quest.isRoutine && quest.originalActionHint && quest.status === 'done') {
          const existing = routineQuestsMap.get(quest.originalActionHint);
          if (!existing || new Date(quest.created_date) > new Date(existing.created_date)) {
            routineQuestsMap.set(quest.originalActionHint, quest);
          }
        }
      }
      
      // 将最新的 routine 模板 ID 加入保护集合
      for (const template of routineQuestsMap.values()) {
        routineTemplateIds.add(template.id);
      }
      
      console.log(`🛡️ 保护 ${routineTemplateIds.size} 个 routine 模板不被删除`);
      
      // 🔥 步骤2: 过滤出需要删除的任务（已完成、超过7天、非大项目、非 routine 模板）
      console.log('\n🔍 开始过滤待删除任务...');
      
      oldQuests = allQuests.filter(quest => {
        // 必须是已完成状态
        if (quest.status !== 'done') {
          return false;
        }
        
        // 必须有任务日期
        if (!quest.date) {
          console.log(`⚠️ 任务 ${quest.id} 没有date字段`);
          return false;
        }
        
        // 检查任务日期是否超过7天（使用 date 字段而不是 updated_date）
        const questDate = new Date(quest.date + 'T00:00:00Z');
        if (questDate >= sevenDaysAgo) {
          return false;
        }
        
        // 保护大项目任务
        if (quest.isLongTermProject) {
          console.log(`🛡️ 保护大项目任务: ${quest.title || quest.actionHint} (${quest.date})`);
          return false;
        }
        
        // 保护 routine 模板（每个 originalActionHint 最新的已完成任务）
        if (routineTemplateIds.has(quest.id)) {
          console.log(`🛡️ 保护routine模板: ${quest.title || quest.actionHint} (${quest.date})`);
          return false;
        }
        
        console.log(`✓ 待删除: ${quest.title || quest.actionHint} (${quest.date}, isRoutine=${quest.isRoutine})`);
        return true;
      });
      
      console.log('🎯 符合删除条件的Quest数量:', oldQuests.length);
      
      if (oldQuests.length > 0) {
        console.log('');
        console.log('📋 需要删除的Quest列表：');
        oldQuests.forEach((quest, index) => {
          console.log(`  ${index + 1}. ${quest.title || quest.actionHint || '未命名'} (任务日期: ${quest.date}, ID: ${quest.id})`);
        });
      } else {
        console.log('✅ 没有找到需要删除的Quest！');
        
        return Response.json({
          success: true,
          message: '没有找到需要删除的已完成Quest',
          executedBy: user.email,
          executedAt: now.toISOString(),
          cutoffTime: cutoffTime,
          stats: {
            questsFound: 0,
            questsDeleted: 0
          }
        });
      }
      
    } catch (error) {
      console.error('❌ 查询Quest失败:', error.message);
      throw new Error('查询Quest记录失败: ' + error.message);
    }
    
    // 删除旧的已完成Quest
    console.log('');
    console.log('📊 删除已完成的Quest记录...');
    
    let questsDeleted = 0;
    const deletedQuests = [];
    const failedQuests = [];
    
    for (const quest of oldQuests) {
      try {
        await base44.entities.Quest.delete(quest.id);
        questsDeleted++;
        deletedQuests.push({
          id: quest.id,
          title: quest.title,
          actionHint: quest.actionHint,
          date: quest.date
        });
        console.log(`✅ 删除Quest: ${quest.title || quest.actionHint || '未命名'} (ID: ${quest.id})`);
      } catch (error) {
        console.error(`❌ 删除Quest失败:`, error.message);
        failedQuests.push({
          id: quest.id,
          title: quest.title,
          error: error.message
        });
      }
    }
    
    console.log('');
    console.log('=== 清理完成 ===');
    console.log(`📊 Quest删除成功: ${questsDeleted}/${oldQuests.length}`);
    
    return Response.json({
      success: true,
      message: `成功删除 ${questsDeleted} 条已完成的Quest记录`,
      executedBy: user.email,
      executedAt: now.toISOString(),
      cutoffTime: cutoffTime,
      deletedQuests,
      failedQuests: failedQuests.length > 0 ? failedQuests : undefined,
      stats: {
        questsFound: oldQuests.length,
        questsDeleted
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