const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const includeDirs = ['App.js', 'src'];
const ignoreDirs = new Set(['node_modules', '.expo', 'dist', 'web-build']);

const files = [];

function collect(target) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
    return;
  }

  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoreDirs.has(entry.name)) {
      continue;
    }
    collect(path.relative(root, path.join(fullPath, entry.name)));
  }
}

includeDirs.forEach(collect);

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
