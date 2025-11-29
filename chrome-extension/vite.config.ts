import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: 'inline',
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/service-worker.ts'),
          popup: resolve(__dirname, 'src/popup/main.ts'),
          sidepanel: resolve(__dirname, 'src/sidepanel/main.ts'),
          'content/auth-listener': resolve(__dirname, 'src/content/auth-listener.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [
      {
        name: 'copy-manifest',
        closeBundle() {
          // Copy and process manifest with environment variables
          try {
            mkdirSync('dist', { recursive: true });

            // Read manifest template
            const manifestTemplate = readFileSync('manifest/manifest.json', 'utf-8');

            // Get URLs from environment variables
            const backendUrl = env.VITE_EXTENSION_BACKEND_URL || 'http://localhost:7600';
            const frontendUrl = env.VITE_EXTENSION_FRONTEND_URL || 'http://localhost:7620';

            console.log('📝 Building manifest with:');
            console.log(`   Backend URL: ${backendUrl}`);
            console.log(`   Frontend URL: ${frontendUrl}`);

            // Replace placeholders
            const manifest = manifestTemplate
              .replace(/__BACKEND_URL__/g, backendUrl)
              .replace(/__FRONTEND_URL__/g, frontendUrl);

            // Write processed manifest
            writeFileSync('dist/manifest.json', manifest);
            console.log('✓ Generated manifest.json with environment URLs');

            // Copy HTML files
            copyFileSync('public/popup.html', 'dist/popup.html');
            copyFileSync('public/sidepanel.html', 'dist/sidepanel.html');

            // Copy icons folder if it exists
            const iconsDir = 'public/icons';
            if (existsSync(iconsDir)) {
              const distIconsDir = 'dist/icons';
              mkdirSync(distIconsDir, { recursive: true });

              const files = readdirSync(iconsDir);
              files.forEach(file => {
                const srcPath = join(iconsDir, file);
                const destPath = join(distIconsDir, file);
                if (statSync(srcPath).isFile() && file.endsWith('.png')) {
                  copyFileSync(srcPath, destPath);
                }
              });

              console.log('✓ Copied icons to dist');
            }

            console.log('✓ Copied HTML files to dist');
          } catch (error) {
            console.error('Error processing manifest:', error);
            throw error;
          }
        },
      },
    ],
  };
});
