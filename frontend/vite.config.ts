import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env from root directory
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  const FRONTEND_PORT = parseInt(env.FRONTEND_PORT || '7620');
  // Backend port is fixed at 7600 for this project. Do NOT fall back to `env.PORT`:
  // loadEnv() with an empty prefix merges all of process.env, so a stray machine-level
  // PORT (e.g. 1234) would override the .env value and break the proxy target.
  const BACKEND_PORT = parseInt(env.BACKEND_PORT || '7600');
  // Use 127.0.0.1 (not "localhost") so the dev proxy targets IPv4 explicitly.
  // The backend binds 0.0.0.0 (IPv4); on Windows "localhost" resolves to IPv6 ::1
  // first, which the backend does not listen on, causing ECONNREFUSED on every
  // proxied /api and /socket.io request.
  const API_URL = env.PUBLIC_API_URL || `http://127.0.0.1:${BACKEND_PORT}`;

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
