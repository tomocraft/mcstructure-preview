import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [path.join(root, 'media', 'viewer.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: path.join(root, 'media', 'viewer.bundle.js'),
  sourcemap: true,
  target: 'es2020',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching viewer bundle...');
} else {
  await esbuild.build(options);
}