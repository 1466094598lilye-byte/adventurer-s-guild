import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, response_json_schema } = await req.json();

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'DeepSeek API key not configured' }, { status: 500 });
    }

    const messages = [{ role: "user", content: prompt }];
    
    const requestBody = {
      model: "deepseek-chat",
      messages: messages
    };

    // 如果需要JSON输出，添加response_format
    if (response_json_schema) {
      requestBody.response_format = {
        type: "json_object"
      };
      // 在prompt中明确要求JSON格式
      messages[0].content = `${prompt}\n\nPlease respond with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`;
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      return Response.json({ 
        error: `DeepSeek API error: ${response.status}`,
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 如果需要JSON，解析返回结果
    if (response_json_schema) {
      try {
        const jsonResult = JSON.parse(content);
        return Response.json(jsonResult);
      } catch (e) {
        console.error('Failed to parse JSON from DeepSeek:', content);
        return Response.json({ 
          error: 'Invalid JSON response from DeepSeek',
          raw_content: content 
        }, { status: 500 });
      }
    }

    // 否则返回纯文本
    return Response.json({ content });

  } catch (error) {
    console.error('callDeepSeek error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});