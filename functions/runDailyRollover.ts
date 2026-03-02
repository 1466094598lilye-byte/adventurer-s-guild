import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, subDays } from 'npm:date-fns@3.6.0';

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");

async function generateRoutineTitle(actionHint) {
  const prompt = `你是【星陨纪元冒险者工会】的首席史诗书记官。

**当前冒险者每日修炼内容：** ${actionHint}

请为这个每日修炼任务生成**全新的**RPG风格标题（只需要标题，不需要重新评定难度）。

要求：
1. 标题要有变化，不要每天都一样（但核心内容要体现任务本质）
2. 格式：【2字类型】+ 7字标题
3. 保持任务的核心特征

只返回标题，格式：{"title": "..."}`;

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

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
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
    // 幂等保护：检查今天是否已经执行过日更
    // ============================================================
    const lastRolloverDate = user.lastRolloverDate;
    if (lastRolloverDate === today) {
      // 即使标记了今天已执行，也检查 routine 任务是否真的存在（容错）
      const todayCheck = await base44.entities.Quest.filter({ date: today, isRoutine: true }, '-created_date', 10);
      const hasRoutineQuests = todayCheck.length > 0;
      if (hasRoutineQuests) {
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
      routineQuestsUpdated: 0,
    };

    // ============================================================
    // 步骤1: 规划任务创建（nextDayPlannedQuests -> 今日任务）
    // ============================================================
    console.log('=== 步骤1: 处理规划任务 ===');
    const nextDayPlanned = user.nextDayPlannedQuests || [];
    const lastPlannedDate = user.lastPlannedDate;

    if (nextDayPlanned.length > 0 && lastPlannedDate && lastPlannedDate < today) {
      console.log(`发现 ${nextDayPlanned.length} 项规划任务，开始创建...`);

      // 立即清空，防止重复创建
      await base44.asServiceRole.entities.User.update(user.id, {
        nextDayPlannedQuests: []
      });

      // 并行创建所有规划任务（规划任务是明文，不需要加密）
      await Promise.all(
        nextDayPlanned.map(async (plannedQuest) => {
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
        })
      );

      results.plannedQuestsCreated = nextDayPlanned.length;
      console.log(`✅ 规划任务创建完成: ${results.plannedQuestsCreated} 条`);
    } else {
      console.log('无需处理的规划任务');
    }

    // ============================================================
    // 步骤2: Routine 任务生成
    // ============================================================
    console.log('=== 步骤2: 处理 routine 任务 ===');

    // 获取所有历史 routine 模板（排除今天）
    const allRoutineTemplates = await base44.entities.Quest.filter(
      { isRoutine: true }, '-created_date', 200
    );
    const templatesExcludingToday = allRoutineTemplates.filter(t => t.date !== today);

    // 按 originalActionHint 去重，保留最新的一条作为模板
    const activeTemplatesMap = new Map();
    for (const template of templatesExcludingToday) {
      const key = template.originalActionHint;
      if (!key) continue;
      const existing = activeTemplatesMap.get(key);
      if (!existing ||
          template.date > existing.date ||
          (template.date === existing.date && new Date(template.created_date) > new Date(existing.created_date))) {
        activeTemplatesMap.set(key, template);
      }
    }

    console.log(`唯一 routine 模板数: ${activeTemplatesMap.size}`);

    // 获取今日已有的任务
    const todayQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
    const todayRoutineQuests = todayQuests.filter(q => q.isRoutine && q.source === 'routine');

    // 删除废弃的今日 routine 任务（模板已不存在的）
    for (const todayQuest of todayRoutineQuests) {
      const key = todayQuest.originalActionHint;
      if (key && !activeTemplatesMap.has(key)) {
        await base44.entities.Quest.delete(todayQuest.id);
        results.routineQuestsDeleted++;
        console.log(`✅ 删除废弃 routine 任务: ${todayQuest.id}`);
      }
    }

    // 找出今日缺少的 routine 任务，并行生成标题后串行创建（防重）
    const toCreate = [];
    for (const [actionHint, templateQuest] of activeTemplatesMap) {
      const alreadyExists = todayQuests.some(
        q => q.isRoutine && q.originalActionHint === actionHint
      );
      if (!alreadyExists) {
        toCreate.push({ actionHint, templateQuest });
      }
    }

    console.log(`需要创建的 routine 任务数: ${toCreate.length}`);

    if (toCreate.length > 0) {
      // 并行生成所有标题
      const titles = await Promise.all(
        toCreate.map(({ actionHint }) =>
          generateRoutineTitle(actionHint).catch(() => null)
        )
      );

      // 串行创建（防并发重复）
      for (let i = 0; i < toCreate.length; i++) {
        const { actionHint, templateQuest } = toCreate[i];
        const title = titles[i];
        if (!title) continue;

        // 创建前再次检查
        const checkAgain = await base44.entities.Quest.filter({ date: today, isRoutine: true }, '-created_date', 200);
        const alreadyCreated = checkAgain.some(q => q.originalActionHint === actionHint);
        if (alreadyCreated) {
          console.log(`⚠️ 已存在，跳过: ${actionHint}`);
          continue;
        }

        await base44.entities.Quest.create({
          title,
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
        console.log(`✅ 创建 routine 任务: ${actionHint}`);
      }
    }

    // ============================================================
    // 幂等标记：所有任务创建完成后再记录（防止中途失败导致跳过）
    // ============================================================
    await base44.auth.updateMe({ lastRolloverDate: today });

    console.log(`=== 日更完成 ===`, results);

    return Response.json({ success: true, skipped: false, results });
    

  } catch (error) {
    console.error('runDailyRollover error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});