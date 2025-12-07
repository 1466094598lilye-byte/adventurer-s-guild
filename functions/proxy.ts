export async function onRequest(req) {
  // 你的 R2 上的 sw.js 文件地址
  const swUrl = "https://pub-42253c4c8dae42078b671d08c4abd8ac.r2.dev/sw.js";

  // 从 R2 拉取 sw.js 文件
  const res = await fetch(swUrl);

  if (!res.ok) {
    return new Response("// Failed to load SW from R2", {
      status: 500,
      headers: { "Content-Type": "application/javascript" }
    });
  }

  const swText = await res.text();

  // 以静态 JS 的方式返回给浏览器
  return new Response(swText, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      // 必须让浏览器把这个文件当成长期可缓存的脚本
      "Cache-Control": "public, max-age=3600"
    }
  });
}