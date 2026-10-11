import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/apiRoutes';
import { loadCatalogData } from './services/catalogService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Pre-load catalog data into memory
loadCatalogData();

// Mount API routes
app.use(apiRouter);

// Serve Vite in development or static dist in production
export async function startServer() {
  if (isProd) {
    app.use(express.static(path.resolve(rootDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(rootDir, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
      resolve(server);
    });
  });
}

// Auto-start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
