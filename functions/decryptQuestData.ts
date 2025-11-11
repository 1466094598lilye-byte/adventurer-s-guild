import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { encryptedTitle, encryptedActionHint } = body;

    if (!encryptedTitle || !encryptedActionHint) {
      return Response.json({ 
        error: 'Missing required fields: encryptedTitle and encryptedActionHint' 
      }, { status: 400 });
    }

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

    // 解密 title
    const titleData = atob(encryptedTitle);
    const titleIv = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
      titleIv[i] = titleData.charCodeAt(i);
    }
    const titleCiphertext = new Uint8Array(titleData.length - 12);
    for (let i = 0; i < titleData.length - 12; i++) {
      titleCiphertext[i] = titleData.charCodeAt(i + 12);
    }
    
    const titleDecrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: titleIv },
      key,
      titleCiphertext
    );

    // 解密 actionHint
    const actionHintData = atob(encryptedActionHint);
    const actionHintIv = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
      actionHintIv[i] = actionHintData.charCodeAt(i);
    }
    const actionHintCiphertext = new Uint8Array(actionHintData.length - 12);
    for (let i = 0; i < actionHintData.length - 12; i++) {
      actionHintCiphertext[i] = actionHintData.charCodeAt(i + 12);
    }
    
    const actionHintDecrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: actionHintIv },
      key,
      actionHintCiphertext
    );

    return Response.json({
      title: new TextDecoder().decode(titleDecrypted),
      actionHint: new TextDecoder().decode(actionHintDecrypted)
    });

  } catch (error) {
    console.error('Decryption error:', error);
    return Response.json({ 
      error: 'Decryption failed', 
      details: error.message 
    }, { status: 500 });
  }
});