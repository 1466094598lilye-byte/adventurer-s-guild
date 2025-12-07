export async function onRequest(context) {
  const manifest = {
    id: "/",
    name: "Adventurer's Guild",
    short_name: "Guild",
    description: "Turn your to-do list into epic quests",
    start_url: "/",
    display: "standalone",
    background_color: "#F9FAFB",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/functions/pwaicon192",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: "/functions/pwaicon512",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store"
    }
  });
}