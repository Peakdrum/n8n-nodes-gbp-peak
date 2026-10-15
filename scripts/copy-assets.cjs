const { copyFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'dist', 'nodes', 'GbpPeak');
mkdirSync(destination, { recursive: true });
copyFileSync(
  path.join(root, 'nodes', 'GbpPeak', 'gbppeak.svg'),
  path.join(destination, 'gbppeak.svg'),
);
