import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, subDays } from 'npm:date-fns@3.6.0';

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");

async function generateRoutineTitle(actionHint) {
  const prompt = `你是RPG游戏的任务书记官。请为以下每日任务生成一个新的RPG风格标题。

任务内容：${actionHint}

要求：
1. 格式严格为：【2字类型】加7个汉字的描述
2. 类型从以下选择：征讨、探索、铸造、研习、护送、调查、收集、锻造、外交、记录、守护、净化
3. 禁止使用"任务"二字

示例：{"title":"【研习】钻研多邻国语言奥秘"}

请返回JSON：`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed.title;
}

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
    
    // 支持预生成模式：为指定日期（如明天）预生成 routine 任务
    const targetDate = body.targetDate || today;
    const isPrefetch = !!body.targetDate && body.targetDate !== today;

    // ============================================================
    // 预生成模式（isPrefetch=true）：只为 targetDate 生成 routine 任务，不做规划任务、连胜等逻辑
    // ============================================================
    if (isPrefetch) {
      console.log(`=== 预生成模式：为 ${targetDate} 生成 routine 任务 ===`);

      const allRoutineTemplates = await base44.entities.Quest.filter({ isRoutine: true }, '-created_date', 200);
      const templatesExcludingTarget = allRoutineTemplates.filter(t => t.date !== targetDate);
      const activeTemplatesMap = new Map();
      for (const template of templatesExcludingTarget) {
        const key = template.originalActionHint;
        if (!key) continue;
        const existing = activeTemplatesMap.get(key);
        if (!existing || template.date > existing.date) activeTemplatesMap.set(key, template);
      }

      const targetQuests = await base44.entities.Quest.filter({ date: targetDate, isRoutine: true }, '-created_date', 200);
      const toCreate = [];
      for (const [actionHint, templateQuest] of activeTemplatesMap) {
        if (!targetQuests.some(q => q.originalActionHint === actionHint)) {
          toCreate.push({ actionHint, templateQuest });
        }
      }

      console.log(`预生成：需要创建 ${toCreate.length} 个 routine 任务`);

      if (toCreate.length > 0) {
        const titles = await Promise.all(
          toCreate.map(({ actionHint }) => generateRoutineTitle(actionHint).catch(() => null))
        );
        for (let i = 0; i < toCreate.length; i++) {
          const { actionHint, templateQuest } = toCreate[i];
          const title = titles[i];
          if (!title) continue;
          // 创建前再次确认
          const checkAgain = await base44.entities.Quest.filter({ date: targetDate, isRoutine: true }, '-created_date', 200);
          if (checkAgain.some(q => q.originalActionHint === actionHint)) continue;
          await base44.entities.Quest.create({
            title, actionHint,
            difficulty: templateQuest.difficulty,
            rarity: templateQuest.rarity,
            date: targetDate,
            status: 'todo',
            source: 'routine',
            isRoutine: true,
            originalActionHint: actionHint,
            tags: []
          });
          console.log(`✅ 预生成 routine: ${actionHint}`);
        }
      }

      return Response.json({ success: true, prefetch: true, targetDate, count: toCreate.length });
    }

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

    console.log(`=== 开始执行日更 (${today}) ===`);

    const results = {
      plannedQuestsCreated: 0,
      routineQuestsCreated: 0,
      routineQuestsDeleted: 0,
    };

    // ============================================================
    // 步骤1: 规划任务创建（nextDayPlannedQuests -> 今日任务）
    // ============================================================
    const nextDayPlanned = user.nextDayPlannedQuests || [];
    const lastPlannedDate = user.lastPlannedDate;

    if (nextDayPlanned.length > 0 && lastPlannedDate && lastPlannedDate < today) {
      await base44.asServiceRole.entities.User.update(user.id, { nextDayPlannedQuests: [] });
      await Promise.all(
        nextDayPlanned.map(plannedQuest =>
          base44.entities.Quest.create({
            title: plannedQuest.title,
            actionHint: plannedQuest.actionHint,
            difficulty: plannedQuest.difficulty,
            rarity: plannedQuest.rarity,
            date: today,
            status: 'todo',
            source: 'ai',
            tags: plannedQuest.tags || []
          })
        )
      );
      results.plannedQuestsCreated = nextDayPlanned.length;
      console.log(`✅ 规划任务创建完成: ${results.plannedQuestsCreated} 条`);
    }

    // ============================================================
    // 步骤2: Routine 任务生成（优先使用预生成的，否则现场生成）
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

    // 删除废弃的今日 routine 任务
    for (const todayQuest of todayRoutineQuests) {
      const key = todayQuest.originalActionHint;
      if (key && !activeTemplatesMap.has(key)) {
        await base44.entities.Quest.delete(todayQuest.id);
        results.routineQuestsDeleted++;
      }
    }

    // 找出缺少的并创建
    const toCreate = [];
    for (const [actionHint, templateQuest] of activeTemplatesMap) {
      if (!todayQuests.some(q => q.isRoutine && q.originalActionHint === actionHint)) {
        toCreate.push({ actionHint, templateQuest });
      }
    }

    if (toCreate.length > 0) {
      const titles = await Promise.all(
        toCreate.map(({ actionHint }) => generateRoutineTitle(actionHint).catch(() => null))
      );
      for (let i = 0; i < toCreate.length; i++) {
        const { actionHint, templateQuest } = toCreate[i];
        // 降级：如果 AI 生成失败，使用模板的原标题
        const title = titles[i] || templateQuest.title;
        const checkAgain = await base44.entities.Quest.filter({ date: today, isRoutine: true }, '-created_date', 200);
        if (checkAgain.some(q => q.originalActionHint === actionHint)) continue;
        await base44.entities.Quest.create({
          title, actionHint,
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
        console.log(`✅ 创建 routine: ${actionHint} -> ${title}`);
      }
    }

    await base44.auth.updateMe({ lastRolloverDate: today });
    console.log(`=== 日更完成 ===`, results);
    return Response.json({ success: true, skipped: false, results });

  } catch (error) {
    console.error('runDailyRollover error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});