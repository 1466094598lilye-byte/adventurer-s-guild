export async function onRequest(context) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#FFE66D"/>
  <path d="M96 40 L100 44 L100 100 L120 120 L116 124 L100 108 L92 108 L76 124 L72 120 L92 100 L92 44 Z" fill="#000" stroke="#000" stroke-width="3"/>
  <rect x="94" y="120" width="4" height="20" fill="#8B4513"/>
  <circle cx="96" cy="145" r="8" fill="#FFD700" stroke="#000" stroke-width="2"/>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000"
    }
  });
}