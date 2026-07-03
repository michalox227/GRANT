/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // Strona główna = SPA z public/app.html (mapa, kalendarz, filtry, liczniki).
      // beforeFiles, żeby wygrać z app/page.tsx.
      beforeFiles: [{ source: "/", destination: "/app.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};
export default nextConfig;
