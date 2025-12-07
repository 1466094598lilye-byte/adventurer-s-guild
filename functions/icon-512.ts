export async function onRequest(context) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FFE66D"/>
  <path d="M256 100 L270 114 L270 270 L320 320 L310 330 L270 290 L242 290 L202 330 L192 320 L242 270 L242 114 Z" fill="#000" stroke="#000" stroke-width="8"/>
  <rect x="248" y="320" width="16" height="60" fill="#8B4513"/>
  <circle cx="256" cy="390" r="24" fill="#FFD700" stroke="#000" stroke-width="6"/>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000"
    }
  });
}