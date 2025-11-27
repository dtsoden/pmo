import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export default defineConfig({
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
        // Copy manifest and HTML files to dist
        try {
          mkdirSync('dist', { recursive: true });
          copyFileSync('manifest/manifest.json', 'dist/manifest.json');
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

          console.log('✓ Copied manifest and HTML files to dist');
        } catch (error) {
          console.error('Error copying files:', error);
        }
      },
    },
  ],
});
