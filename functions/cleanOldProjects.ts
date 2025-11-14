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
      // 🔧 修复：使用 list() 而不是 filter()，因为 filter() 可能不支持 RLS
      const allProjects = await base44.asServiceRole.entities.LongTermProject.list();
      
      console.log('✅ 查询到所有项目数量:', allProjects.length);
      
      // 🐛 DEBUG: 打印第一个项目的完整结构
      if (allProjects.length > 0) {
        console.log('');
        console.log('🐛 调试：第一个项目的数据结构：');
        console.log(JSON.stringify(allProjects[0], null, 2));
        console.log('');
      }
      
      // 在内存中过滤出已完成且超过2年的项目
      oldProjects = allProjects.filter(project => {
        // Base44 实体数据存储在 data 字段中
        const projectData = project.data || project;
        const status = projectData.status;
        const completionDate = projectData.completionDate;
        
        console.log(`检查项目: ${projectData.projectName || '未命名'}`);
        console.log(`  状态: ${status}`);
        console.log(`  完成日期: ${completionDate}`);
        
        // 必须是已完成状态
        if (status !== 'completed') {
          console.log('  ⏭️  跳过（未完成）');
          return false;
        }
        
        // 必须有完成日期
        if (!completionDate) {
          console.log('  ⚠️  跳过（没有完成日期）');
          return false;
        }
        
        // 检查是否超过2年
        const shouldDelete = completionDate < twoYearsAgoStr;
        console.log(`  📅 ${completionDate} < ${twoYearsAgoStr} ? ${shouldDelete ? '✅ 符合删除条件' : '❌ 不符合'}`);
        
        return shouldDelete;
      });
      
      console.log('');
      console.log('🎯 符合删除条件的项目数量:', oldProjects.length);
      
      if (oldProjects.length > 0) {
        console.log('');
        console.log('📋 需要删除的项目列表：');
        oldProjects.forEach((project, index) => {
          const projectData = project.data || project;
          const name = projectData.projectName || '未命名';
          const date = projectData.completionDate || '无日期';
          console.log(`  ${index + 1}. ${name} (完成于: ${date}, ID: ${project.id})`);
        });
      } else {
        console.log('✅ 没有找到需要删除的项目！');
      }
      
    } catch (error) {
      console.error('❌ 查询项目失败:', error.message);
      console.error('错误详情:', error);
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
      foundProjects: oldProjects.map(p => {
        const projectData = p.data || p;
        return {
          id: p.id,
          name: projectData.projectName || '未命名',
          completionDate: projectData.completionDate || '无日期'
        };
      }),
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