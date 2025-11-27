# Extension Icons

This folder should contain PNG icon files for the Chrome extension:

- `icon16.png` - 16x16 pixels
- `icon32.png` - 32x32 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

For now, the extension will use Chrome's default icon if these files are missing.

To create icons:
1. Design a simple timer/clock icon
2. Export as PNG at the required sizes
3. Place files in this directory
4. Rebuild the extension with `npm run build`
