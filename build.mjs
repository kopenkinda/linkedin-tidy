// Bundles src/ into one script that works as both the MV3 content script and a
// Tampermonkey userscript, and writes a loadable extension folder to dist/.
import * as esbuild from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
// CI appends its run number, so every published build is newer than the last: Tampermonkey
// only updates a script whose @version went up. Chrome takes up to four numbers too.
const version = process.env.BUILD_NUMBER ? `${pkg.version}.${process.env.BUILD_NUMBER}` : pkg.version;

// CI publishes the script to the dist branch (.github/workflows/build.yml).
const repo = 'https://github.com/kopenkinda/linkedin-tidy';
const published = 'https://raw.githubusercontent.com/kopenkinda/linkedin-tidy/dist/linkedin-tidy.user.js';

const banner = `// ==UserScript==
// @name         LinkedIn Tidy
// @namespace    ${repo}
// @version      ${version}
// @description  Two-column, shadcn-styled LinkedIn without the clutter.
// @homepageURL  ${repo}
// @updateURL    ${published}
// @downloadURL  ${published}
// @match        https://www.linkedin.com/*
// @run-at       document-start
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
