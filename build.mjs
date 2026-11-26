// Bundles src/ into one script that works as both the MV3 content script and a
// Tampermonkey userscript, and writes a loadable extension folder to dist/.
import * as esbuild from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));

const banner = `// ==UserScript==
// @name         LinkedIn Tidy
// @version      ${version}
// @description  Two-column, shadcn-styled LinkedIn without the clutter.
// @match        https://www.linkedin.com/*
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==`;

const options = {
  entryPoints: ['src/main.ts'],
  outfile: 'dist/linkedin.user.js',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  loader: { '.css': 'text' },
  banner: { js: banner },
  logLevel: 'info',
};

await mkdir('dist', { recursive: true });
const manifest = JSON.parse(await readFile('static/manifest.json', 'utf8'));
await writeFile('dist/manifest.json', JSON.stringify({ ...manifest, version }, null, 2) + '\n');

if (process.argv.includes('--watch')) {
  await (await esbuild.context(options)).watch();
} else {
  await esbuild.build(options);
}
