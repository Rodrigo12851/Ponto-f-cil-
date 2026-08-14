import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  const sizes = [
    { name: 'public/icon-192.png', size: 192 },
    { name: 'public/icon-512.png', size: 512 },
    { name: 'public/icon-maskable-192.png', size: 192 },
    { name: 'public/icon-maskable-512.png', size: 512 },
    { name: 'public/apple-touch-icon.png', size: 180 },
    { name: 'public/favicon-32x32.png', size: 32 },
    { name: 'public/favicon-16x16.png', size: 16 },
  ];

  for (const item of sizes) {
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.resolve(item.name));
    console.log(`Generated ${item.name}`);
  }
}

generate().catch(console.error);
