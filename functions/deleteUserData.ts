import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 用户身份验证 - 必须是已登录用户
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ 
                error: 'Unauthorized - User must be logged in to delete account' 
            }, { status: 401 });
        }
        
        const userEmail = user.email;
        
        console.log(`Starting data deletion for user: ${userEmail}`);
        
        // 定义所有需要删除的实体
        const entitiesToDelete = [
            'Quest', 
            'DailyChest', 
            'Loot', 
            'LongTermProject', 
            'DeepRestTask'
        ];
        
        const deletionResults = {};
        let totalDeleted = 0;
        
        // 逐个实体删除用户数据
        for (const entityName of entitiesToDelete) {
            try {
                // 使用 service role 查询该用户的所有记录
                const records = await base44.asServiceRole.entities[entityName].filter({ 
                    created_by: userEmail 
                });
                
                let deleteCount = 0;
                
                // 逐条删除记录
                for (const record of records) {
                    await base44.asServiceRole.entities[entityName].delete(record.id);
                    deleteCount++;
                }
                
                deletionResults[entityName] = {
                    success: true,
                    count: deleteCount
                };
                
                totalDeleted += deleteCount;
                
                console.log(`${entityName}: Deleted ${deleteCount} records`);
                
            } catch (error) {
                console.error(`Error deleting ${entityName}:`, error);
                deletionResults[entityName] = {
                    success: false,
                    error: error.message,
                    count: 0
                };
            }
        }
        
        // 检查是否所有删除操作都成功
        const allSuccess = Object.values(deletionResults).every(result => result.success);
        
        if (!allSuccess) {
            return Response.json({
                success: false,
                message: 'Partial data deletion - some entities failed',
                totalDeleted,
                details: deletionResults
            }, { status: 500 });
        }
        
        console.log(`Successfully deleted all data for user: ${userEmail}`);
        console.log(`Total records deleted: ${totalDeleted}`);
        
        return Response.json({
            success: true,
            message: 'All user data deleted successfully',
            totalDeleted,
            details: deletionResults
        });
        
    } catch (error) {
        console.error('Unexpected error in deleteUserData:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});