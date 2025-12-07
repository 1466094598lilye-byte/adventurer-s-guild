export async function onRequest(context) {
  const manifest = {
    name: "Adventurer's Guild: 勇者的清单",
    short_name: "Adventurer's Guild",
    description: "Turn your to-do list into epic quests.",
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
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache"
    }
  });
}