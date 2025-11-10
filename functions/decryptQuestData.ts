import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { encryptedTitle, encryptedActionHint } = await req.json();
    
    if (!encryptedTitle || !encryptedActionHint) {
      return Response.json({ error: 'Missing encrypted data' }, { status: 400 });
    }

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      return Response.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    // 使用 Web Crypto API 进行 AES-GCM 解密
    const decoder = new TextDecoder();
    
    // 从密钥字符串生成解密密钥
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 解密 title
    const titleData = atob(encryptedTitle);
    const titleBytes = new Uint8Array(titleData.length);
    for (let i = 0; i < titleData.length; i++) {
      titleBytes[i] = titleData.charCodeAt(i);
    }
    const titleIv = titleBytes.slice(0, 12);
    const titleCiphertext = titleBytes.slice(12);
    
    const decryptedTitleBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: titleIv },
      keyMaterial,
      titleCiphertext
    );
    const title = decoder.decode(decryptedTitleBuffer);

    // 解密 actionHint
    const hintData = atob(encryptedActionHint);
    const hintBytes = new Uint8Array(hintData.length);
    for (let i = 0; i < hintData.length; i++) {
      hintBytes[i] = hintData.charCodeAt(i);
    }
    const hintIv = hintBytes.slice(0, 12);
    const hintCiphertext = hintBytes.slice(12);
    
    const decryptedHintBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hintIv },
      keyMaterial,
      hintCiphertext
    );
    const actionHint = decoder.decode(decryptedHintBuffer);

    return Response.json({
      title,
      actionHint
    });

  } catch (error) {
    console.error('Decryption error:', error);
    return Response.json({ 
      error: 'Decryption failed', 
      details: error.message 
    }, { status: 500 });
  }
});