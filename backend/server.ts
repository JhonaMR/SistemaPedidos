import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import apiRouter from './routes/api';
import { PORT, NODE_ENV, FOTOS_REFERENCIAS_DIR } from './config';
import { initDatabaseSchema } from './services/dbConnection';

const isProd = NODE_ENV === 'production';

async function startServer() {
  // Initialize PostgreSQL database schemas if they do not exist
  await initDatabaseSchema();

  const app = express();
  app.use(cors()); // Permitir peticiones desde Netlify u otros orígenes
  app.use(express.json({ limit: '50mb' })); // Support larger payloads for Base64 images if needed
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve product images statically
  app.use('/fotos_referencias', express.static(FOTOS_REFERENCIAS_DIR));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Integrate Vite or Serve Static Files
  if (!isProd) {
    const reactPlugin = (await import('@vitejs/plugin-react')).default;
    const tailwindPlugin = (await import('@tailwindcss/vite')).default;

    const vite = await createViteServer({
      configFile: false,
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {
          ignored: ['**/db_json/**', '**/fotos_referencias/**']
        },
      },
      appType: 'spa',
      plugins: [reactPlugin(), tailwindPlugin()],
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        },
      },
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Toma Pedido Backend] Server running in ${NODE_ENV} mode at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Toma Pedido Backend] Failed to start server:', err);
});
