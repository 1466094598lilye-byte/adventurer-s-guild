import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const RECIPES = {
  Rare: { from: 'Common', count: 5 },
  Epic: { from: 'Rare', count: 7 },
  Legendary: { from: 'Epic', count: 3 }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lootIds, targetRarity, language } = await req.json();

    // Validate input
    if (!lootIds || !Array.isArray(lootIds) || !targetRarity) {
      return Response.json({ 
        success: false, 
        error: 'Invalid input parameters' 
      }, { status: 400 });
    }

    // Check recipe exists
    const recipe = RECIPES[targetRarity];
    if (!recipe) {
      return Response.json({ 
        success: false, 
        error: 'Invalid target rarity' 
      }, { status: 400 });
    }

    // Verify correct number of items
    if (lootIds.length !== recipe.count) {
      return Response.json({ 
        success: false, 
        error: `Recipe requires exactly ${recipe.count} items` 
      }, { status: 400 });
    }

    // Fetch all provided loot items
    const lootItems = await Promise.all(
      lootIds.map(id => base44.entities.Loot.filter({ id }))
    );

    // Verify all items exist and belong to the user
    for (let i = 0; i < lootItems.length; i++) {
      const items = lootItems[i];
      if (!items || items.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'One or more loot items not found' 
        }, { status: 404 });
      }
      
      const item = items[0];
      if (item.created_by !== user.email) {
        return Response.json({ 
          success: false, 
          error: 'Cannot craft items you do not own' 
        }, { status: 403 });
      }

      // Verify rarity matches recipe
      if (item.rarity !== recipe.from) {
        return Response.json({ 
          success: false, 
          error: `All items must be ${recipe.from} rarity` 
        }, { status: 400 });
      }
    }

    // Use language from frontend or fallback to browser language
    const userLanguage = language || (() => {
      const browserLang = req.headers.get('accept-language') || '';
      return browserLang.toLowerCase().includes('zh') ? 'zh' : 'en';
    })();

    // Generate new loot with LLM
    const { prompt, nameRange, descRange } = generatePrompt(targetRarity, userLanguage);

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

    // Create new loot item
    const newLoot = await base44.entities.Loot.create({
      name: result.name,
      flavorText: result.flavorText,
      icon: result.icon,
      rarity: targetRarity,
      obtainedAt: new Date().toISOString()
    });

    // Delete consumed items
    await Promise.all(
      lootIds.map(id => base44.entities.Loot.delete(id))
    );

    return Response.json({ 
      success: true, 
      newLoot: newLoot 
    });

  } catch (error) {
    console.error('Crafting error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});

function generatePrompt(rarity, language) {
  // 使用与宝箱系统相同的随机类别选择机制
  const categories = ['工具', '饰品', '食物', '布料', '木器', '陶器', '铁器', '植物', '石器', '皮革', '骨器', '羽毛', '贝壳', '矿石', '书页', '墨水', '绳索', '袋囊', '香料', '蜡烛'];
  const categoriesEn = ['tools', 'jewelry', 'food', 'cloth', 'wood', 'pottery', 'iron', 'plants', 'stone', 'leather', 'bone', 'feathers', 'shells', 'minerals', 'scrolls', 'ink', 'rope', 'pouches', 'spices', 'candles'];
  
  const randomSeed = Math.floor(Math.random() * 100000) + Date.now() % 100000;
  const hash = (randomSeed * 2654435761) >>> 0;
  const selectedCategory = language === 'zh' 
    ? categories[hash % categories.length]
    : categoriesEn[hash % categoriesEn.length];

  if (language === 'zh') {
    const rarityConfig = {
      'Rare': {
        role: '在城市中经营的魔导道具商人',
        context: '你的店铺位于冒险者公会或学院附近，顾客多为常驻冒险者、雇佣兵、小贵族随从。你售卖的并非传说中的奇物，而是经过验证、稳定可靠、可以反复出售的魔导道具。你的货源来自城市工坊、炼金坊或长期合作的魔导技师。',
        task: `请从这个经营场景出发，描述你店铺中正在出售的一件**${selectedCategory}类**商品。`,
        nameLength: '5-10个汉字',
        descLength: '25-35个汉字'
      },
      'Epic': {
        role: '王国的司库',
        context: '你负责保管国家最重要的宝物与象征。你所接触的物品往往与王权、战争、外交或国家命运紧密相关。这些物品并非为了日常使用，而是被珍藏、被记载、被在特定时刻取出。它们可能来自古老的王朝、决定胜负的战争、或一次改变历史的盟约。',
        task: `请从你的视角，描述你所保管的一件**${selectedCategory}类**宝物。`,
        nameLength: '6-12个汉字',
        descLength: '40-60个汉字'
      },
      'Legendary': {
        role: '创世之初的存在',
        context: '你见证并塑造世界的法则。在世界的某个关键转折点，你决定将一件存在交付给一位被选中的勇者。这并非单纯的"武器"或"奖励"，而是承载概念、命运或选择的礼物。它可能改变使用者，也可能改变世界本身。',
        task: `请描述你赐予勇者的这件**${selectedCategory}类**宝物。`,
        nameLength: '8-15个汉字',
        descLength: '60-90个汉字'
      }
    };

    const config = rarityConfig[rarity];

    return {
      prompt: `【角色扮演】

你是一名${config.role}。

【场景设定】
${config.context}

🎲 创意随机种子：${randomSeed}
（请将这个数字作为灵感，每次生成不同的物品）
⚠️ 【强制要求】本次必须生成：${selectedCategory}类物品（不能是其他类别！）

【任务】
${config.task}

【任务】
${config.task}

⚠️ **核心要求 - 必须体现合成来源**：
这件物品是冒险者通过合成工艺铸就的战利品，你的描述中**必须明确包含**以下合成相关的表达（至少使用其中2-3个概念）：
- "由...熔炼而成" / "从...中铸就"
- "经过...淬炼" / "淬火锻造"
- "在工坊中铸成" / "铸造师的杰作"
- "升华自..." / "熔铸自多件..."
- "工匠的巧手将...融合" / "炉火中诞生"

【格式要求】
- 物品名称：${config.nameLength}
- 物品简介：${config.descLength}
- 选择一个合适的emoji作为图标

请完全沉浸在你的角色中，用自然的方式描述这件物品，**确保描述中能让人明确感知到这是一件合成而来的宝物**。`,
      nameRange: config.nameLength,
      descRange: config.descLength
    };
  } else {
    const rarityConfig = {
      'Rare': {
        role: 'a magical tools merchant operating in the city',
        context: 'Your shop is located near the Adventurer\'s Guild or Academy. Your customers are mostly resident adventurers, mercenaries, and minor noble attendants. You don\'t sell legendary artifacts, but verified, reliable, repeatedly sellable magical tools. Your supply comes from city workshops, alchemy labs, or long-term partner magic technicians.',
        task: `From this business setting, describe one **${selectedCategory}** item currently for sale in your shop.`,
        nameLength: '3-5 words',
        descLength: '25-35 words'
      },
      'Epic': {
        role: 'the Royal Treasurer of the kingdom',
        context: 'You are responsible for safeguarding the nation\'s most important treasures and symbols. The items you handle are closely tied to sovereignty, war, diplomacy, or national destiny. These items are not for daily use, but are preserved, recorded, and taken out at specific moments. They may come from ancient dynasties, battles that decided victory, or treaties that changed history.',
        task: `From your perspective, describe one **${selectedCategory}** treasure you safeguard.`,
        nameLength: '4-6 words',
        descLength: '40-60 words'
      },
      'Legendary': {
        role: 'a being from the dawn of creation',
        context: 'You witness and shape the laws of the world. At a critical turning point in history, you decide to bestow an existence upon a chosen hero. This is not merely a "weapon" or "reward," but a gift carrying concepts, destiny, or choice. It may change the bearer, or change the world itself.',
        task: `Describe this **${selectedCategory}** treasure you bestow upon the hero.`,
        nameLength: '5-8 words',
        descLength: '60-90 words'
      }
    };

    const config = rarityConfig[rarity];

    return {
      prompt: `【Role Play】

You are ${config.role}.

【Scene Setting】
${config.context}

🎲 Creative Random Seed: ${randomSeed}
(Use this number as inspiration to generate a different item each time)
⚠️ 【Mandatory Requirement】This time you MUST generate: ${selectedCategory} category item (cannot be other categories!)

【Task】
${config.task}

⚠️ **Core Requirement - Must Reflect Crafting Origin**:
This item is a treasure crafted by adventurers through synthesis. Your description **must explicitly include** crafting-related expressions (use at least 2-3 of these concepts):
- "forged from..." / "crafted from..."
- "tempered through..." / "smelted in..."
- "born in the workshop" / "masterwork of the forge"
- "ascended from..." / "fused from multiple..."
- "artisan's hands merged..." / "born of flame"

【Format Requirements】
- Item Name: ${config.nameLength}
- Item Description: ${config.descLength}
- Choose an appropriate emoji as the icon

Fully immerse yourself in your role and describe this item naturally, **ensuring the description clearly conveys that this is a synthesized treasure**.`,
      nameRange: config.nameLength,
      descRange: config.descLength
    };
  }
}