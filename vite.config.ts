import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Kör filerna i /api som Vercel-funktioner även under `npm run dev`,
 * så att ni slipper `vercel dev`. Varje fil exporterar POST/GET(request: Request).
 */
function vercelApiInDev(): Plugin {
  return {
    name: "vercel-api-in-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const name = req.url.split("?")[0].replace(/^\/api\//, "");
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method ?? "GET"];
          if (!handler) {
            res.statusCode = 405;
            return res.end("Method not allowed");
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end(String(err));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Gör .env.local tillgänglig för api-funktionerna i dev (process.env).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [
      react(),
      vercelApiInDev(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg"],
        manifest: {
          name: "Jurassic Run",
          short_name: "Jurassic Run",
          description: "Run like there's no tomorrow! Löprundor formade som utdöda djur.",
          theme_color: "#07051a",
          background_color: "#07051a",
          display: "standalone",
          icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\/data\/.*\.(geojson|json)$/,
              handler: "CacheFirst",
              options: { cacheName: "geodata" },
            },
          ],
        },
      }),
    ],
  };
});
