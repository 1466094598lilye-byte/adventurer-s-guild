import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // 获取加密密钥
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      return Response.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    // 导入密钥
    const keyData = new TextEncoder().encode(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // 辅助函数：加密单个字段
    const encryptField = async (value) => {
      if (!value) return null;
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        new TextEncoder().encode(value)
      );
      
      return btoa(
        String.fromCharCode(...iv) + 
        String.fromCharCode(...new Uint8Array(encrypted))
      );
    };

    // 辅助函数：加密单个任务对象
    const encryptSingleQuest = async (quest) => {
      const result = {};
      
      if (quest.title) {
        result.encryptedTitle = await encryptField(quest.title);
      }
      if (quest.actionHint) {
        result.encryptedActionHint = await encryptField(quest.actionHint);
      }
      if (quest.originalActionHint) {
        result.originalActionHint = await encryptField(quest.originalActionHint);
      }
      
      return result;
    };

    // 检查是否为批量处理
    if (body.quests && Array.isArray(body.quests)) {
      // 批量处理：并行加密所有任务
      const encryptedQuests = await Promise.all(
        body.quests.map(quest => encryptSingleQuest(quest))
      );
      return Response.json({ encryptedQuests });
    } else {
      // 单个任务处理（保持向后兼容）
      const { title, actionHint, originalActionHint } = body;
      
      if (!title || !actionHint) {
        return Response.json({ 
          error: 'Missing required fields: title and actionHint' 
        }, { status: 400 });
      }
      
      const result = await encryptSingleQuest(body);
      return Response.json(result);
    }

  } catch (error) {
    console.error('Encryption error:', error);
    return Response.json({ 
      error: 'Encryption failed', 
      details: error.message 
    }, { status: 500 });
  }
});