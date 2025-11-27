// Script to generate favicon PNGs dynamically from .env
// Run: node scripts/generate-favicons.js
// Requires: npm install sharp dotenv

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const staticDir = join(__dirname, '..', 'static');

// Load .env from project root
config({ path: join(rootDir, '.env') });

// Get app name from env or use defaults
const APP_NAME = process.env.APP_NAME || 'PMO Platform';
const APP_SHORT_NAME = process.env.APP_SHORT_NAME || 'PMO';

console.log(`Generating favicons for: ${APP_NAME} (${APP_SHORT_NAME})`);

// Create a simple favicon as PNG buffer
async function createFavicon(size) {
  // Blue circle with white text
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="url(#grad)"/>
      <text x="${size/2}" y="${size * 0.65}" font-family="Arial, sans-serif" font-size="${size * 0.375}" font-weight="bold" fill="white" text-anchor="middle">${APP_SHORT_NAME}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Create SVG favicon
function createSvgFavicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#grad)"/>
  <text x="16" y="21" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${APP_SHORT_NAME}</text>
</svg>`;
}

// Create web manifest
function createManifest() {
  return JSON.stringify({
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    icons: [
      { src: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    theme_color: '#3b82f6',
    background_color: '#ffffff',
    display: 'standalone'
  }, null, 2);
}

async function main() {
  try {
    // Generate PNG favicons
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
    ];

    for (const { size, name } of sizes) {
      const buffer = await createFavicon(size);
      writeFileSync(join(staticDir, name), buffer);
      console.log(`Created ${name}`);
    }

    // Generate SVG favicon
    writeFileSync(join(staticDir, 'favicon.svg'), createSvgFavicon());
    console.log('Created favicon.svg');

    // Generate web manifest
    writeFileSync(join(staticDir, 'site.webmanifest'), createManifest());
    console.log('Created site.webmanifest');

    console.log('\nAll favicons generated successfully!');
    console.log(`App: ${APP_NAME} | Short: ${APP_SHORT_NAME}`);
  } catch (error) {
    console.error('Error generating favicons:', error.message);
    console.log('\nTo generate favicons, install dependencies:');
    console.log('  npm install sharp dotenv');
    console.log('Then run: node scripts/generate-favicons.js');
  }
}

main();
