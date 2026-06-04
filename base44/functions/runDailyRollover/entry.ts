import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 使用前端传入的客户端本地日期，避免服务器时区问题
    const body = await req.json().catch(() => ({}));
    const today = body.clientToday || new Date().toISOString().slice(0, 10);

    // ============================================================
    // 幂等保护：检查今天是否已经执行过日更
    // ============================================================
    const lastRolloverDate = user.lastRolloverDate;
    if (lastRolloverDate === today) {
      // 即使标记了今天已执行，也检查 routine 任务是否真的存在（容错）
      const todayCheck = await base44.entities.Quest.filter({ date: today, isRoutine: true }, '-created_date', 10);
      if (todayCheck.length > 0) {
        console.log(`今天 (${today}) 已执行过日更，跳过`);
        return Response.json({ success: true, skipped: true, reason: 'already_ran_today' });
      }
      console.log(`今天 (${today}) 标记已执行但 routine 任务缺失，重新执行...`);
    }

    // 尽早声明今日已执行，防止并发请求重复创建任务
    await base44.auth.updateMe({ lastRolloverDate: today });

    console.log(`=== 开始执行日更 (${today}) ===`);

    const results = {
      plannedQuestsCreated: 0,
      routineQuestsCreated: 0,
      routineQuestsDeleted: 0,
    };

    // ============================================================
    // 步骤1: 规划任务创建（nextDayPlannedQuests -> 今日任务）
    // 先创建全部任务，成功后再清空 nextDayPlannedQuests，避免 Promise.all 部分失败时数据丢失
    // ============================================================
    const nextDayPlanned = user.nextDayPlannedQuests || [];
    const lastPlannedDate = user.lastPlannedDate;

    if (nextDayPlanned.length > 0 && lastPlannedDate && lastPlannedDate < today) {
      // 加密规划任务（与普通任务一致）
      let encryptedQuests = nextDayPlanned;
      try {
        const { data: encData } = await base44.functions.invoke('encryptQuestData', {
          quests: nextDayPlanned.map(q => ({ title: q.title, actionHint: q.actionHint }))
        });
        if (encData?.encryptedQuests?.length === nextDayPlanned.length) {
          encryptedQuests = nextDayPlanned.map((q, i) => ({
            ...q,
            title: encData.encryptedQuests[i].encryptedTitle,
            actionHint: encData.encryptedQuests[i].encryptedActionHint
          }));
        }
      } catch (e) {
        console.warn('规划任务加密失败，使用明文:', e);
      }

      // 串行创建，确保全部成功后再清空；避免 Promise.all 部分失败导致只创建部分且数据被清空
      for (const plannedQuest of encryptedQuests) {
        await base44.entities.Quest.create({
          title: plannedQuest.title,
          actionHint: plannedQuest.actionHint,
          difficulty: plannedQuest.difficulty,
          rarity: plannedQuest.rarity,
          date: today,
          status: 'todo',
          source: 'ai',
          tags: plannedQuest.tags || []
        });
        results.plannedQuestsCreated++;
      }
      if (results.plannedQuestsCreated > 0) {
        await base44.asServiceRole.entities.User.update(user.id, { nextDayPlannedQuests: [] });
      }
      console.log(`✅ 规划任务创建完成: ${results.plannedQuestsCreated} 条`);
    }

    // ============================================================
    // 步骤2: Routine 任务生成（直接复用模板标题，不调用 AI，消除生成时的竞态窗口）
    // ============================================================
    const allRoutineTemplates = await base44.entities.Quest.filter({ isRoutine: true }, '-created_date', 200);
    const templatesExcludingToday = allRoutineTemplates.filter(t => t.date !== today);
    const activeTemplatesMap = new Map();
    for (const template of templatesExcludingToday) {
      const key = template.originalActionHint;
      if (!key) continue;
      const existing = activeTemplatesMap.get(key);
      if (!existing || template.date > existing.date) activeTemplatesMap.set(key, template);
    }

    const todayQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
    const todayRoutineQuests = todayQuests.filter(q => q.isRoutine && q.source === 'routine');

    // 删除废弃的今日 routine 任务（模板已不存在的）
    for (const todayQuest of todayRoutineQuests) {
      const key = todayQuest.originalActionHint;
      if (key && !activeTemplatesMap.has(key)) {
        await base44.entities.Quest.delete(todayQuest.id);
        results.routineQuestsDeleted++;
      }
    }

    // 找出今天还缺的 routine 并创建
    const toCreate = [];
    for (const [actionHint, templateQuest] of activeTemplatesMap) {
      if (!todayQuests.some(q => q.isRoutine && q.originalActionHint === actionHint)) {
        toCreate.push({ actionHint, templateQuest });
      }
    }

    for (const { actionHint, templateQuest } of toCreate) {
      // 创建前再查一次（多一层防护；现在没有 AI 慢调用，查→建窗口极小）
      const checkAgain = await base44.entities.Quest.filter({ date: today, isRoutine: true }, '-created_date', 200);
      if (checkAgain.some(q => q.originalActionHint === actionHint)) continue;
      // 直接复用模板标题，不再调用 DeepSeek（现场生成变为毫秒级）
      await base44.entities.Quest.create({
        title: templateQuest.title,
        actionHint,
        difficulty: templateQuest.difficulty,
        rarity: templateQuest.rarity,
        date: today,
        status: 'todo',
        source: 'routine',
        isRoutine: true,
        originalActionHint: actionHint,
        tags: []
      });
      results.routineQuestsCreated++;
      console.log(`✅ 创建 routine: ${actionHint} -> ${templateQuest.title}`);
    }

    console.log(`=== 日更完成 ===`, results);
    return Response.json({ success: true, skipped: false, results });

  } catch (error) {
    console.error('runDailyRollover error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
