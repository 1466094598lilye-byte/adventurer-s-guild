import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const body = await req.json().catch(() => ({}));
    // tomorrow 由前端传入（用户本地时间的明天）
    const tomorrow = body.clientTomorrow;
    if (!tomorrow) {
      return Response.json({ error: 'clientTomorrow is required' }, { status: 400 });
    }

    // 幂等保护：检查明天的 routine 任务是否已经生成过
    const existingTomorrowRoutines = await base44.entities.Quest.filter(
      { date: tomorrow, isRoutine: true }, '-created_date', 10
    );
    if (existingTomorrowRoutines.length > 0) {
      console.log(`明天 (${tomorrow}) 的 routine 任务已存在，跳过`);
      return Response.json({ success: true, skipped: true, reason: 'already_prepared' });
    }

    // 获取所有历史 routine 模板（排除明天）
    const allRoutineTemplates = await base44.entities.Quest.filter(
      { isRoutine: true }, '-created_date', 200
    );
    const templates = allRoutineTemplates.filter(t => t.date !== tomorrow);

    // 按 originalActionHint 去重，保留最新
    const activeTemplatesMap = new Map();
    for (const template of templates) {
      const key = template.originalActionHint;
      if (!key) continue;
      const existing = activeTemplatesMap.get(key);
      if (!existing ||
          template.date > existing.date ||
          (template.date === existing.date && new Date(template.created_date) > new Date(existing.created_date))) {
        activeTemplatesMap.set(key, template);
      }
    }

    if (activeTemplatesMap.size === 0) {
      return Response.json({ success: true, skipped: false, created: 0, reason: 'no_routines' });
    }

    console.log(`预生成明日 (${tomorrow}) routine 任务，模板数: ${activeTemplatesMap.size}`);

    // 并行生成标题
    const entries = Array.from(activeTemplatesMap.entries());
    const titles = await Promise.all(
      entries.map(([actionHint]) =>
        generateRoutineTitle(actionHint).catch(() => null)
      )
    );

    // 串行创建（防重）
    let created = 0;
    for (let i = 0; i < entries.length; i++) {
      const [actionHint, templateQuest] = entries[i];
      const title = titles[i];
      if (!title) continue;

      // 创建前再次检查
      const checkAgain = await base44.entities.Quest.filter(
        { date: tomorrow, isRoutine: true }, '-created_date', 200
      );
      if (checkAgain.some(q => q.originalActionHint === actionHint)) {
        console.log(`⚠️ 已存在，跳过: ${actionHint}`);
        continue;
      }

      await base44.entities.Quest.create({
        title,
        actionHint,
        difficulty: templateQuest.difficulty,
        rarity: templateQuest.rarity,
        date: tomorrow,
        status: 'todo',
        source: 'routine',
        isRoutine: true,
        originalActionHint: actionHint,
        tags: []
      });

      created++;
      console.log(`✅ 预创建明日 routine: ${actionHint}`);
    }

    return Response.json({ success: true, skipped: false, created });

  } catch (error) {
    console.error('prepareNextDayRoutines error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});