const fs = require('fs');
const path = require('path');
const stitchDir = path.join(__dirname, 'stitch-ui');
const dirs = fs.readdirSync(stitchDir);
const imgMap = {};

dirs.forEach(d => {
  const p = path.join(stitchDir, d, 'code.html');
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf8');
    const matches = [...html.matchAll(/(?:src|url)\(["']?(https:\/\/lh3\.googleusercontent\.com\/[^"'\)]+)["']?\)/g)];
    const directSrc = [...html.matchAll(/src=["'](https:\/\/lh3\.googleusercontent\.com\/[^"']+)["']/g)];
    [...matches, ...directSrc].forEach(m => {
      const url = m[1];
      if (!imgMap[url]) imgMap[url] = [];
      if (!imgMap[url].includes(d)) imgMap[url].push(d);
    });
  }
});

console.log("Total unique assets:", Object.keys(imgMap).length);
fs.writeFileSync(path.join(__dirname, 'assets-registry.json'), JSON.stringify(imgMap, null, 2));
console.log("Saved assets-registry.json");
