'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

(async () => {
  const root = path.join(__dirname, '..');
  const svgPath = path.join(root, 'build', 'icon.svg');
  const buildPngPath = path.join(root, 'build', 'icon.png');
  const runtimePngPath = path.join(root, 'sl.png');
  const icoPath = path.join(root, 'build', 'icon.ico');

  const pngBuffer = await sharp(svgPath, { density: 320 })
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  fs.writeFileSync(buildPngPath, pngBuffer);
  fs.writeFileSync(runtimePngPath, pngBuffer);

  const ico = await pngToIco(buildPngPath);
  fs.writeFileSync(icoPath, ico);

  console.log('Generated SafeLedger runtime PNG and Windows ICO icons.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
