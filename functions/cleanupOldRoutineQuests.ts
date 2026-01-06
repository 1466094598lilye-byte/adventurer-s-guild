import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only: verify user is authenticated and is admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Query all routine quests using service role
    console.log('Starting cleanup: Querying all routine quests...');
    const routineQuests = await base44.asServiceRole.entities.Quest.filter({ 
      isRoutine: true 
    }, '-created_date', 10000); // Large limit to get all routine quests
    
    console.log(`Found ${routineQuests.length} routine quests`);

    // Group by originalActionHint
    console.log('Grouping quests by originalActionHint...');
    const groupedQuests = {};
    
    for (const quest of routineQuests) {
      const key = quest.originalActionHint || 'no_hint';
      if (!groupedQuests[key]) {
        groupedQuests[key] = [];
      }
      groupedQuests[key].push(quest);
    }
    
    const groupCount = Object.keys(groupedQuests).length;
    console.log(`Grouped into ${groupCount} unique originalActionHint groups`);

    // TODO: Identify latest template in each group
    // TODO: Delete old versions

    return Response.json({ 
      success: true,
      message: `Found ${routineQuests.length} routine quests`,
      foundCount: routineQuests.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});