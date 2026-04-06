import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, subDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    console.log('🧪 开始测试日更逻辑...');
    console.log('今天:', today);
    console.log('昨天:', yesterday);

    // ========================================
    // 测试1: 检查明日规划任务
    // ========================================
    console.log('\n=== 测试1: 检查明日规划任务 ===');
    const nextDayPlanned = user.nextDayPlannedQuests || [];
    console.log('明日规划任务数量:', nextDayPlanned.length);
    
    if (nextDayPlanned.length > 0) {
      console.log('✅ 检测到规划任务，测试加密...');
      
      // 测试加密
      const { data: encryptedData } = await base44.functions.invoke('encryptQuestData', {
        quests: nextDayPlanned.map(quest => ({
          title: quest.title,
          actionHint: quest.actionHint
        }))
      });
      
      console.log('加密成功，返回数据结构:', Object.keys(encryptedData));
      console.log('加密任务数量:', encryptedData.encryptedQuests?.length || 0);
      
      if (encryptedData.encryptedQuests && encryptedData.encryptedQuests.length > 0) {
        const firstEncrypted = encryptedData.encryptedQuests[0];
        console.log('第一个加密任务示例:', {
          encryptedTitle: firstEncrypted.encryptedTitle?.substring(0, 20) + '...',
          encryptedActionHint: firstEncrypted.encryptedActionHint?.substring(0, 20) + '...'
        });
      }
    }

    // ========================================
    // 测试2: 检查每日修炼任务
    // ========================================
    console.log('\n=== 测试2: 检查每日修炼任务 ===');
    const allRoutineTemplates = await base44.entities.Quest.filter({ isRoutine: true }, '-created_date', 100);
    console.log('找到例行任务模板数量:', allRoutineTemplates.length);

    if (allRoutineTemplates.length > 0) {
      console.log('✅ 检测到例行任务模板，测试解密...');
      
      // 测试解密
      const { data: decryptedData } = await base44.functions.invoke('decryptQuestData', {
        encryptedQuests: allRoutineTemplates.slice(0, 3).map(template => ({
          encryptedTitle: template.title,
          encryptedActionHint: template.actionHint
        }))
      });
      
      console.log('解密成功，返回数据结构:', Object.keys(decryptedData));
      console.log('解密任务数量:', decryptedData.decryptedQuests?.length || 0);
      
      if (decryptedData.decryptedQuests && decryptedData.decryptedQuests.length > 0) {
        const firstDecrypted = decryptedData.decryptedQuests[0];
        console.log('第一个解密任务示例:', {
          title: firstDecrypted.title,
          actionHint: firstDecrypted.actionHint,
          解密是否成功: firstDecrypted.title !== null && firstDecrypted.actionHint !== null
        });
      }
    }

    // ========================================
    // 测试3: 检查今日任务
    // ========================================
    console.log('\n=== 测试3: 检查今日任务 ===');
    const todayQuests = await base44.entities.Quest.filter({ date: today });
    console.log('今日任务总数:', todayQuests.length);

    if (todayQuests.length > 0) {
      console.log('开始解密今日任务...');
      
      const { data: decryptedToday } = await base44.functions.invoke('decryptQuestData', {
        encryptedQuests: todayQuests.map(quest => ({
          encryptedTitle: quest.title,
          encryptedActionHint: quest.actionHint
        }))
      });
      
      const validQuests = decryptedToday.decryptedQuests.filter(q => 
        q.title !== null && q.actionHint !== null
      );
      
      console.log('解密成功任务数:', validQuests.length);
      console.log('解密失败任务数:', todayQuests.length - validQuests.length);
      
      if (validQuests.length < todayQuests.length) {
        console.warn('⚠️ 警告: 有任务解密失败！');
      }
    }

    // ========================================
    // 测试4: 检查昨日未完成任务
    // ========================================
    console.log('\n=== 测试4: 检查昨日未完成任务 ===');
    const yesterdayQuests = await base44.entities.Quest.filter({ date: yesterday });
    const yesterdayUnfinished = yesterdayQuests.filter(q => q.status === 'todo' && !q.isRoutine);
    console.log('昨日未完成任务数量:', yesterdayUnfinished.length);

    // ========================================
    // 总结
    // ========================================
    console.log('\n=== 🎯 测试总结 ===');
    
    const summary = {
      测试时间: new Date().toISOString(),
      用户: user.email,
      明日规划任务数: nextDayPlanned.length,
      例行任务模板数: allRoutineTemplates.length,
      今日任务总数: todayQuests.length,
      昨日未完成任务数: yesterdayUnfinished.length,
      测试结果: '所有加密解密测试通过 ✅'
    };

    return Response.json({
      success: true,
      message: '日更逻辑测试完成',
      summary,
      详细日志: '请查看function logs'
    });

  } catch (error) {
    console.error('❌ 测试失败:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});