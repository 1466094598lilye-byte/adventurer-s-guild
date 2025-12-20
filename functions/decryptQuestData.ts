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
      ['decrypt']
    );

    // 辅助函数：解密单个字段
    const decryptField = async (encryptedValue) => {
      if (!encryptedValue) return null;
      
      try {
        const data = atob(encryptedValue);
        const iv = new Uint8Array(12);
        for (let i = 0; i < 12; i++) {
          iv[i] = data.charCodeAt(i);
        }
        const ciphertext = new Uint8Array(data.length - 12);
        for (let i = 0; i < data.length - 12; i++) {
          ciphertext[i] = data.charCodeAt(i + 12);
        }
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          ciphertext
        );
        return new TextDecoder().decode(decrypted);
      } catch (error) {
        console.error('Failed to decrypt field:', error);
        return encryptedValue; // 解密失败时返回原值
      }
    };

    // 辅助函数：解密单个任务对象
    const decryptSingleQuest = async (quest) => {
      const result = {};
      
      if (quest.encryptedTitle) {
        result.title = await decryptField(quest.encryptedTitle);
      }
      if (quest.encryptedActionHint) {
        result.actionHint = await decryptField(quest.encryptedActionHint);
      }
      if (quest.encryptedOriginalActionHint) {
        result.originalActionHint = await decryptField(quest.encryptedOriginalActionHint);
      }
      
      return result;
    };

    // 检查是否为批量处理
    if (body.encryptedQuests && Array.isArray(body.encryptedQuests)) {
      // 批量处理：并行解密所有任务
      const decryptedQuests = await Promise.all(
        body.encryptedQuests.map(quest => decryptSingleQuest(quest))
      );
      return Response.json({ decryptedQuests });
    } else {
      // 单个任务处理（保持向后兼容）
      const { encryptedTitle, encryptedActionHint, encryptedOriginalActionHint } = body;
      
      // 至少需要一个字段
      if (!encryptedTitle && !encryptedActionHint && !encryptedOriginalActionHint) {
        return Response.json({ 
          error: 'At least one field is required' 
        }, { status: 400 });
      }
      
      const result = await decryptSingleQuest(body);
      return Response.json(result);
    }

  } catch (error) {
    console.error('Decryption error:', error);
    return Response.json({ 
      error: 'Decryption failed', 
      details: error.message 
    }, { status: 500 });
  }
});