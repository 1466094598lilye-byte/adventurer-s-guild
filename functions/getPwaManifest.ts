import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
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
        src: "/functions/icon-192",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: "/functions/icon-512",
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
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
});