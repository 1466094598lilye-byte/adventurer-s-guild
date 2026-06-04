import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const RECIPES = {
  Rare: { from: 'Common', count: 5 },
  Epic: { from: 'Rare', count: 7 },
  Legendary: { from: 'Epic', count: 9 }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lootIds, targetRarity, prompt } = await req.json();

    // Validate input
    if (!lootIds || !Array.isArray(lootIds) || !targetRarity) {
      return Response.json({
        success: false,
        error: 'Invalid input parameters'
      }, { status: 400 });
    }

    // 文案 prompt 由前端传入（与开宝箱共用同一份 getTreasurePrompt 源）
    if (!prompt || typeof prompt !== 'string') {
      return Response.json({
        success: false,
        error: 'Missing loot prompt'
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

    // Generate new loot with LLM（prompt 与开宝箱共用 getTreasurePrompt，由前端传入）
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
