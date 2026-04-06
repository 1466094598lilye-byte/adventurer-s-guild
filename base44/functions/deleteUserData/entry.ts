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
        const recordsToDelete = {};
        let totalDeleted = 0;
        
        // 阶段1: 预检查 - 收集所有需要删除的记录
        console.log('Phase 1: Pre-check - collecting all records to delete');
        try {
            for (const entityName of entitiesToDelete) {
                const records = await base44.asServiceRole.entities[entityName].filter({ 
                    created_by: userEmail 
                });
                
                recordsToDelete[entityName] = records;
                console.log(`${entityName}: Found ${records.length} records`);
            }
        } catch (error) {
            console.error('Pre-check failed:', error);
            return Response.json({
                success: false,
                message: 'Pre-check failed - unable to access all entity records',
                error: error.message
            }, { status: 500 });
        }
        
        // 阶段2: 执行删除 - 如果任何删除失败，立即停止
        console.log('Phase 2: Executing deletion - atomic operation');
        for (const entityName of entitiesToDelete) {
            const records = recordsToDelete[entityName];
            let deleteCount = 0;
            
            try {
                for (const record of records) {
                    try {
                        await base44.asServiceRole.entities[entityName].delete(record.id);
                        deleteCount++;
                    } catch (deleteError) {
                        // 删除失败 - 立即停止并返回错误
                        console.error(`CRITICAL: Failed to delete ${entityName} record ${record.id}:`, deleteError.message);
                        
                        return Response.json({
                            success: false,
                            message: 'Deletion failed mid-process - data may be partially deleted',
                            failedAt: {
                                entity: entityName,
                                recordId: record.id,
                                error: deleteError.message
                            },
                            partiallyDeleted: {
                                totalDeleted: totalDeleted + deleteCount,
                                details: deletionResults
                            },
                            recommendation: 'Please retry the deletion operation or contact support'
                        }, { status: 500 });
                    }
                }
                
                deletionResults[entityName] = {
                    success: true,
                    count: deleteCount
                };
                
                totalDeleted += deleteCount;
                console.log(`${entityName}: Successfully deleted ${deleteCount} records`);
                
            } catch (error) {
                console.error(`Error processing ${entityName}:`, error);
                
                return Response.json({
                    success: false,
                    message: 'Entity processing failed',
                    failedAt: {
                        entity: entityName,
                        error: error.message
                    },
                    partiallyDeleted: {
                        totalDeleted,
                        details: deletionResults
                    }
                }, { status: 500 });
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
        
        // 尝试删除用户自身的 User 实体记录
        let userRecordDeleted = false;
        try {
            // 查找当前用户的 User 记录
            const userRecords = await base44.asServiceRole.entities.User.filter({ 
                email: userEmail 
            });
            
            if (userRecords && userRecords.length > 0) {
                const userId = userRecords[0].id;
                await base44.asServiceRole.entities.User.delete(userId);
                userRecordDeleted = true;
                console.log(`User entity record deleted for: ${userEmail}`);
            }
            
            deletionResults['User'] = {
                success: true,
                count: userRecordDeleted ? 1 : 0
            };
            
        } catch (error) {
            console.error('Error deleting User entity record:', error);
            deletionResults['User'] = {
                success: false,
                error: error.message,
                count: 0,
                note: 'User entity deletion may be restricted by platform'
            };
        }
        
        console.log(`Successfully deleted all data for user: ${userEmail}`);
        console.log(`Total records deleted: ${totalDeleted}`);
        
        return Response.json({
            success: true,
            message: 'All user data deleted successfully',
            totalDeleted,
            userRecordDeleted,
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