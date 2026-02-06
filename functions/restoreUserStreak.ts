import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 验证用户
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 从请求中获取参数
    const { targetStreakCount, targetLongestStreak } = await req.json();
    
    // 验证参数
    if (!targetStreakCount || !targetLongestStreak) {
      return Response.json({ 
        error: '缺少必要参数：targetStreakCount 和 targetLongestStreak' 
      }, { status: 400 });
    }

    // 验证参数为有效数字
    const streakCount = parseInt(targetStreakCount);
    const longestStreak = parseInt(targetLongestStreak);
    
    if (isNaN(streakCount) || isNaN(longestStreak) || streakCount < 0 || longestStreak < 0) {
      return Response.json({ 
        error: '参数必须为有效的正整数' 
      }, { status: 400 });
    }

    // 获取今天的日期（格式：yyyy-MM-dd）
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 获取昨天的日期
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 恢复连胜数据
    // 固定补偿3个freeze tokens
    // 🔥 关键：设置 lastClearDate 为昨天，这样今天就不会触发连胜中断警告
    await base44.auth.updateMe({
      streakCount: streakCount,
      longestStreak: longestStreak,
      freezeTokenCount: 3,
      lastClearDate: yesterdayStr  // 设置为昨天，表示昨天已完成所有任务
    });

    return Response.json({ 
      success: true,
      message: `已成功恢复连胜数据：当前连胜${streakCount}天，最长连胜${longestStreak}天，并补偿3个freeze tokens！`
    });
  } catch (error) {
    console.error('恢复失败:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});