import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 定时任务运行：直接使用 service role，无需用户认证
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

    // Identify latest template in each group and collect old quests to delete
    console.log('Identifying latest templates and marking old versions for deletion...');
    const questsToDelete = [];
    
    for (const [hint, quests] of Object.entries(groupedQuests)) {
      if (quests.length <= 1) {
        // Only one quest in this group, no cleanup needed
        continue;
      }
      
      // Sort by created_date descending (newest first)
      quests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
      // Keep the first one (newest), mark the rest for deletion
      const latestQuest = quests[0];
      const oldQuests = quests.slice(1);
      
      console.log(`Group "${hint}": Keeping quest ${latestQuest.id}, marking ${oldQuests.length} old versions for deletion`);
      questsToDelete.push(...oldQuests);
    }
    
    console.log(`Total quests to delete: ${questsToDelete.length}`);

    // Collect IDs of quests to delete
    const questIdsToDelete = questsToDelete.map(q => q.id);
    console.log('Quest IDs to delete:', questIdsToDelete);

    // Delete old versions using service role
    if (questIdsToDelete.length > 0) {
      console.log(`Deleting ${questIdsToDelete.length} old routine quest versions...`);
      
      for (const questId of questIdsToDelete) {
        await base44.asServiceRole.entities.Quest.delete(questId);
      }
      
      console.log('Cleanup completed successfully');
    } else {
      console.log('No old quests to delete');
    }

    return Response.json({ 
      success: true,
      message: `Cleanup completed. Deleted ${questIdsToDelete.length} old routine quest versions.`,
      totalRoutineQuests: routineQuests.length,
      groupsFound: groupCount,
      deletedCount: questIdsToDelete.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});