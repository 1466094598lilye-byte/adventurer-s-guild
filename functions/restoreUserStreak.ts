import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 验证用户
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 恢复连胜到13天（从截图看到的最长连胜）
    // 并补偿3个freeze tokens作为道歉
    await base44.auth.updateMe({
      streakCount: 13,
      longestStreak: 13,
      freezeTokenCount: 3
    });

    return Response.json({ 
      success: true,
      message: '已成功恢复连胜到13天，并补偿3个freeze tokens！'
    });
  } catch (error) {
    console.error('恢复失败:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});