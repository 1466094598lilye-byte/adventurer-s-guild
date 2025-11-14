import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 清理已完成超过2年的大项目记录及其关联任务
 * 
 * 安全机制：只有管理员(admin)或系统调用可以执行此操作
 * 建议：每周运行一次
 */
Deno.serve(async (req) => {
  try {
    // 1. 创建 Base44 客户端并进行用户认证
    const base44 = createClientFromRequest(req);
    
    console.log('=== 开始清理旧的大项目记录 ===');
    console.log('执行时间:', new Date().toISOString());
    
    // 2. 验证用户身份（必须是管理员）
    let user;
    try {
      user = await base44.auth.me();
    } catch (error) {
      console.error('用户认证失败:', error.message);
      return Response.json({
        success: false,
        error: 'Unauthorized: Authentication required',
        message: '需要管理员权限才能执行清理操作'
      }, { status: 401 });
    }
    
    // 3. 检查用户角色（只允许 admin）
    if (!user || user.role !== 'admin') {
      console.error('权限不足，当前用户角色:', user?.role || 'unknown');
      return Response.json({
        success: false,
        error: 'Forbidden: Admin role required',
        message: '只有管理员可以执行清理操作',
        userRole: user?.role || 'unknown'
      }, { status: 403 });
    }
    
    console.log('✅ 管理员认证通过:', user.email);
    
    // 4. 计算"2年前"的日期（730天）
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setDate(twoYearsAgo.getDate() - 730); // 2年 = 730天
    
    // 格式化为 yyyy-MM-dd
    const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0];
    
    console.log('📅 当前日期:', now.toISOString().split('T')[0]);
    console.log('📅 2年前日期:', twoYearsAgoStr);
    console.log('🔍 将删除所有 completionDate < ' + twoYearsAgoStr + ' 的项目');
    
    // 5. 查询需要删除的项目（使用 service role 权限）
    console.log('');
    console.log('📊 第一步：查询符合条件的大项目...');
    
    let oldProjects = [];
    try {
      // 查询所有已完成的项目
      const allCompletedProjects = await base44.asServiceRole.entities.LongTermProject.filter({
        status: 'completed'
      });
      
      console.log('✅ 查询到所有已完成的项目数量:', allCompletedProjects.length);
      
      // 在内存中过滤出超过2年的项目
      oldProjects = allCompletedProjects.filter(project => {
        if (!project.completionDate) return false;
        return project.completionDate < twoYearsAgoStr;
      });
      
      console.log('🎯 符合删除条件的项目数量:', oldProjects.length);
      
      if (oldProjects.length > 0) {
        console.log('');
        console.log('📋 需要删除的项目列表：');
        oldProjects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.projectName} (完成于: ${project.completionDate}, ID: ${project.id})`);
        });
      } else {
        console.log('✅ 没有找到需要删除的项目！');
      }
      
    } catch (error) {
      console.error('❌ 查询项目失败:', error.message);
      throw new Error('查询大项目记录失败: ' + error.message);
    }
    
    // 6. TODO: 删除关联的任务
    // - 根据 longTermProjectId 查询并删除所有关联任务
    
    // 7. TODO: 删除项目本身
    // - 删除所有符合条件的 LongTermProject 记录
    
    // 8. 返回成功响应（包含查询到的项目信息）
    return Response.json({
      success: true,
      message: oldProjects.length > 0 
        ? `找到 ${oldProjects.length} 个需要删除的项目（尚未执行删除）`
        : '没有找到需要删除的项目',
      executedBy: user.email,
      executedAt: now.toISOString(),
      cutoffDate: twoYearsAgoStr,
      explanation: `查询所有完成日期早于 ${twoYearsAgoStr} 的大项目`,
      foundProjects: oldProjects.map(p => ({
        id: p.id,
        name: p.projectName,
        completionDate: p.completionDate
      })),
      stats: {
        projectsFound: oldProjects.length,
        projectsDeleted: 0,  // 尚未删除
        questsDeleted: 0     // 尚未删除
      }
    });
    
  } catch (error) {
    console.error('❌ 清理操作执行失败:', error);
    return Response.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      message: '清理操作执行过程中发生错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});