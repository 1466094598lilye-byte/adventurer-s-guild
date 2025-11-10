import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, actionHint } = await req.json();
    
    if (!title || !actionHint) {
      return Response.json({ error: 'Missing title or actionHint' }, { status: 400 });
    }

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      return Response.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    // 使用 Web Crypto API 进行 AES-GCM 加密
    const encoder = new TextEncoder();
    
    // 从密钥字符串生成加密密钥
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // 加密 title
    const titleIv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedTitleBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: titleIv },
      keyMaterial,
      encoder.encode(title)
    );
    const encryptedTitle = btoa(
      String.fromCharCode(...titleIv) + 
      String.fromCharCode(...new Uint8Array(encryptedTitleBuffer))
    );

    // 加密 actionHint
    const hintIv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedHintBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: hintIv },
      keyMaterial,
      encoder.encode(actionHint)
    );
    const encryptedActionHint = btoa(
      String.fromCharCode(...hintIv) + 
      String.fromCharCode(...new Uint8Array(encryptedHintBuffer))
    );

    return Response.json({
      encryptedTitle,
      encryptedActionHint
    });

  } catch (error) {
    console.error('Encryption error:', error);
    return Response.json({ 
      error: 'Encryption failed', 
      details: error.message 
    }, { status: 500 });
  }
});