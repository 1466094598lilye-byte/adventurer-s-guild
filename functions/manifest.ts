Deno.serve(async (req) => {
  const manifest = {
    name: "星陨纪元冒险者工会",
    short_name: "冒险者工会",
    description: "每日任务管理与冒险记录",
    start_url: "/",
    display: "standalone",
    background_color: "#F9FAFB",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23FFE66D'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='%23000'>⚔️</text></svg>",
        sizes: "192x192",
        type: "image/svg+xml"
      },
      {
        src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23FFE66D'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='%23000'>⚔️</text></svg>",
        sizes: "512x512",
        type: "image/svg+xml"
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});