var fs = require('fs');
var path = require('path');

var src = path.resolve(__dirname, '../../packages/core/dist');
var dest = path.resolve(__dirname, '../node_modules/@tpv/core');

if (!fs.existsSync(src)) {
  console.error('@tpv/core dist not found at', src);
  process.exit(1);
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

var pkg = { name: '@tpv/core', main: './index.js', types: './index.d.ts' };
fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pkg));
console.log('@tpv/core copied to node_modules');
