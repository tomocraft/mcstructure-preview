import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const copies = [
  {
    from: path.join(root, 'node_modules', 'three', 'build', 'three.module.js'),
    to: path.join(root, 'media', 'vendor', 'three', 'build', 'three.module.js')
  },
  {
    from: path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'controls', 'OrbitControls.js'),
    to: path.join(root, 'media', 'vendor', 'three', 'examples', 'jsm', 'controls', 'OrbitControls.js')
  }
];

for (const entry of copies) {
  if (!fs.existsSync(entry.from)) {
    throw new Error(`Required source file not found: ${entry.from}`);
  }
  fs.mkdirSync(path.dirname(entry.to), { recursive: true });
  fs.copyFileSync(entry.from, entry.to);
}

console.log('Copied three webview assets to media/vendor/three');
