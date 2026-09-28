const fs = require('fs');
const path = require('path');
const stitchDir = path.join(__dirname, 'stitch-ui');
const dirs = fs.readdirSync(stitchDir);
const detailedAssets = [];

dirs.forEach(d => {
  const p = path.join(stitchDir, d, 'code.html');
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf8');
    const imgTags = html.match(/<img[^>]+>/g) || [];
    imgTags.forEach(tag => {
      const srcMatch = tag.match(/src=["']([^"']+)["']/);
      const altMatch = tag.match(/(?:data-alt|alt)=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1].startsWith('http')) {
        detailedAssets.push({
          screen: d,
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : ''
        });
      }
    });
    // also bg images in style="..."
    const styleBgMatches = [...html.matchAll(/style=["'][^"']*url\(['"]?(https:\/\/[^"')]+)['"]?\)[^"']*["']/g)];
    styleBgMatches.forEach(bm => {
      const tagMatch = bm[0];
      detailedAssets.push({
        screen: d,
        src: bm[1],
        alt: 'Background Hero'
      });
    });
  }
});

fs.writeFileSync(path.join(__dirname, 'detailed-assets.json'), JSON.stringify(detailedAssets, null, 2));
console.log(`Found ${detailedAssets.length} image elements.`);
