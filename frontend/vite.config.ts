import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env from root directory
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  const FRONTEND_PORT = parseInt(env.FRONTEND_PORT || '7620');
  const BACKEND_PORT = parseInt(env.BACKEND_PORT || env.PORT || '7600');
  const API_URL = env.PUBLIC_API_URL || `http://localhost:${BACKEND_PORT}`;

  return {
    plugins: [sveltekit()],
    server: {
      port: FRONTEND_PORT,
      host: true,
      // Allow all hosts in development (can be customized via ALLOWED_HOSTS env var)
      allowedHosts: env.ALLOWED_HOSTS ? env.ALLOWED_HOSTS.split(',') : true,
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
        },
        '/socket.io': {
          target: API_URL,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: true,
    },
    optimizeDeps: {
      exclude: ['@internationalized/date'],
    },
  };
});
