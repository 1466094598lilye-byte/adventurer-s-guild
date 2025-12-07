export async function onRequest(context) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FFE66D"/>
  <path d="M256 100 L266 110 L266 266 L320 320 L310 330 L266 286 L246 286 L202 330 L192 320 L246 266 L246 110 Z" fill="#000" stroke="#000" stroke-width="8"/>
  <rect x="250" y="320" width="12" height="50" fill="#8B4513"/>
  <circle cx="256" cy="385" r="20" fill="#FFD700" stroke="#000" stroke-width="5"/>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000"
    }
  });
}