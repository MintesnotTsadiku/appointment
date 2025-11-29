#!/usr/bin/env node

/**
 * Generate all PWA icon sizes from SVG
 * Uses sharp library to convert SVG to PNG at various sizes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-512x512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'shortcut-book.png', size: 96 },
  { name: 'shortcut-list.png', size: 96 },
];

const inputSvg = path.join(__dirname, 'logo.svg');
const outputDir = __dirname;

async function generateIcons() {
  console.log('🎨 Generating PWA icons from logo.svg...\n');

  if (!fs.existsSync(inputSvg)) {
    console.error(`❌ Error: ${inputSvg} not found!`);
    process.exit(1);
  }

  for (const icon of sizes) {
    try {
      const outputPath = path.join(outputDir, icon.name);
      
      // For maskable icon, we can use the same image (the SVG already has safe zone)
      const image = sharp(inputSvg)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png();

      await image.toFile(outputPath);
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.name}:`, error.message);
    }
  }

  console.log('\n✅ All icons generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
}

generateIcons().catch(console.error);

