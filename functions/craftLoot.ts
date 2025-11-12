import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 合成配方定义
const CRAFTING_RECIPES = {
  'Rare': { 
    fromRarity: 'Common', 
    requiredCount: 5 
  },
  'Epic': { 
    fromRarity: 'Rare', 
    requiredCount: 7 
  }
};

Deno.serve(async (req) => {
  try {
    // 1. 认证用户
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 解析请求参数
    const { lootIds, targetRarity, language } = await req.json();

    // 3. 校验参数
    if (!lootIds || !Array.isArray(lootIds) || lootIds.length === 0) {
      return Response.json({ 
        error: language === 'zh' ? '无效的战利品ID列表' : 'Invalid lootIds' 
      }, { status: 400 });
    }

    if (!targetRarity || !CRAFTING_RECIPES[targetRarity]) {
      return Response.json({ 
        error: language === 'zh' 
          ? '无效的目标稀有度，只能合成稀有或史诗' 
          : 'Invalid target rarity. Can only craft Rare or Epic.' 
      }, { status: 400 });
    }

    const recipe = CRAFTING_RECIPES[targetRarity];

    // 4. 检查数量是否符合配方
    if (lootIds.length !== recipe.requiredCount) {
      return Response.json({ 
        error: language === 'zh'
          ? `合成${targetRarity}需要正好${recipe.requiredCount}个${recipe.fromRarity}物品`
          : `Crafting ${targetRarity} requires exactly ${recipe.requiredCount} ${recipe.fromRarity} items.` 
      }, { status: 400 });
    }

    // 5. 读取所有待消耗的 Loot（无需解密，Loot 数据未加密）
    const loots = [];
    for (const lootId of lootIds) {
      try {
        const lootList = await base44.entities.Loot.filter({ id: lootId });
        if (lootList.length > 0) {
          loots.push(lootList[0]);
        }
      } catch (error) {
        console.error(`Failed to fetch loot ${lootId}:`, error);
      }
    }

    // 6. 验证所有 Loot 都存在
    if (loots.length !== lootIds.length) {
      return Response.json({ 
        error: language === 'zh' 
          ? '部分战利品未找到' 
          : 'Some loot items not found' 
      }, { status: 404 });
    }

    // 7. 验证所有 Loot 都属于当前用户
    const allOwnedByUser = loots.every(loot => loot.created_by === user.email);
    if (!allOwnedByUser) {
      return Response.json({ 
        error: language === 'zh' 
          ? '你不拥有所有这些物品' 
          : 'You do not own all these items' 
      }, { status: 403 });
    }

    // 8. 验证所有 Loot 都是正确的稀有度
    const allCorrectRarity = loots.every(loot => loot.rarity === recipe.fromRarity);
    if (!allCorrectRarity) {
      return Response.json({ 
        error: language === 'zh'
          ? `所有物品必须是${recipe.fromRarity}稀有度才能合成${targetRarity}`
          : `All items must be ${recipe.fromRarity} rarity to craft ${targetRarity}` 
      }, { status: 400 });
    }

    // 9. 使用 LLM 生成新的 Loot
    const prompt = generateCraftingPrompt(targetRarity, language);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          flavorText: { type: "string" },
          icon: { type: "string" }
        },
        required: ["name", "flavorText", "icon"]
      }
    });

    // 10. 先创建新的 Loot（确保生成成功）
    const newLoot = await base44.entities.Loot.create({
      name: result.name,
      flavorText: result.flavorText,
      icon: result.icon,
      rarity: targetRarity,
      obtainedAt: new Date().toISOString()
    });

    console.log(`✅ New ${targetRarity} loot created:`, newLoot.id);

    // 11. 删除所有被消耗的 Loot（创建成功后再删除，降低风险）
    let deletedCount = 0;
    for (const loot of loots) {
      try {
        await base44.entities.Loot.delete(loot.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete loot ${loot.id}:`, error);
        // 继续删除其他的，不中断流程
      }
    }

    console.log(`✅ Deleted ${deletedCount}/${loots.length} consumed loots`);

    // 12. 返回新 Loot 信息
    return Response.json({ 
      success: true, 
      newLoot: newLoot,
      consumedCount: deletedCount
    });

  } catch (error) {
    console.error('❌ Crafting error:', error);
    return Response.json({ 
      error: error.message || 'Failed to craft loot' 
    }, { status: 500 });
  }
});

// 生成合成 Loot 的 Prompt
function generateCraftingPrompt(targetRarity, language) {
  if (language === 'zh') {
    const rarityConfig = {
      'Rare': {
        nameLength: '5-10个汉字',
        descLength: '25-35个汉字',
        context: '稀有 - 有些特别',
        style: '描述其特殊之处、合成来历、实用价值',
        example: '「熔炼银月石」- 五块晨曦碎片在烈焰中融为一体，凝聚成这块散发微光的银月石，蕴含着黎明的祝福之力。'
      },
      'Epic': {
        nameLength: '6-12个汉字',
        descLength: '40-60个汉字',
        context: '史诗 - 强大华丽',
        style: '详细描述其史诗来历、强大能力、象征意义，强调合成升华的过程',
        example: '「永恒誓约之剑」- 七件稀有圣器在铸造大师的引导下，经历三天三夜的淬炼，最终升华为这柄传世之剑。剑身铭刻着古老誓言，每一次挥舞都能感受到前辈英雄的意志共鸣。'
      }
    };

    const config = rarityConfig[targetRarity];

    return `你是【星陨纪元冒险者工会】的宝物铸造大师。一位冒险者刚刚通过合成系统，将多个低级战利品熔炼升华，铸造出了一件全新的${targetRarity}级战利品！

稀有度：${targetRarity}（${config.context}）

要求：
1. 名称：${config.nameLength}，要体现"合成"、"熔炼"、"升华"、"融合"的概念
2. 简介：${config.descLength}，RPG风味，${config.style}
3. **必须暗示这是通过合成获得的**，可以提到"熔炼"、"铸造"、"升华"、"融合"、"淬炼"等过程
4. 选择合适的emoji作为图标（可以是🔥⚔️💎🛡️✨🌟等）

示例：
${config.example}

请生成：`;

  } else {
    const rarityConfig = {
      'Rare': {
        nameLength: '3-5 words',
        descLength: '20-30 words',
        context: 'Rare - Somewhat special',
        style: 'Describe its special features, crafting origin, and practical value',
        example: '"Forged Moonsilver Stone" - Five dawn fragments melted together in fierce flames, coalescing into this glowing moonsilver stone, imbued with the blessing power of daybreak.'
      },
      'Epic': {
        nameLength: '4-6 words',
        descLength: '40-60 words',
        context: 'Epic - Powerful and magnificent',
        style: 'Detail its epic origin, powerful abilities, symbolic meaning, emphasizing the synthesis ascension process',
        example: '"Eternal Covenant Greatsword" - Seven rare relics, guided by the master smith, endured three days and nights of tempering, finally ascending into this legendary blade. Ancient oaths are inscribed upon its edge, and every swing resonates with the will of heroes past.'
      }
    };

    const config = rarityConfig[targetRarity];

    return `You are the Master Artificer of the [Starfall Era Adventurer's Guild]. An adventurer just used the crafting system to smelt and ascend multiple lower-tier treasures, forging a brand new ${targetRarity}-tier item!

Rarity: ${targetRarity} (${config.context})

Requirements:
1. Name: ${config.nameLength}, must convey concepts like "forged", "smelted", "ascended", "fused"
2. Description: ${config.descLength}, RPG flavor, ${config.style}
3. **Must hint that this was obtained through crafting**, mention processes like "smelting", "forging", "ascending", "fusing", "tempering"
4. Choose appropriate emoji as icon (can be 🔥⚔️💎🛡️✨🌟 etc.)

Example:
${config.example}

Generate:`;
  }
}