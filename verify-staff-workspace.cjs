const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function checkPage(html, name) {
  assert.match(html.trimEnd(), /<\/body>\s*<\/html>$/i, name + ' is incomplete');
  assert.ok(!html.includes('[Truncated]'), name + ' contains a truncation marker');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length, name + ' has no application script');
  for (const [, source] of scripts) new vm.Script(source, {filename: name});
}

try {
  const file = process.argv[2] || 'staff-workspace.html';
  const page = fs.readFileSync(file, 'utf8');
  checkPage(page, file);
  assert.match(page, /login\.addEventListener\('submit'/, 'Staff sign-in handler is missing');
  assert.match(page, /\/auth\/v1\/token\?grant_type=password/, 'Staff authentication request is missing');
  assert.match(page, /signOut\.addEventListener\('click'/, 'Staff sign-out handler is missing');
  const embedded = page.match(/const demoBase64='([A-Za-z0-9+/=]+)'/);
  assert.ok(embedded, 'Embedded staff dashboard is missing');
  const dashboard = Buffer.from(embedded[1], 'base64');
  assert.equal(dashboard.toString('base64'), embedded[1], 'Embedded dashboard encoding is incomplete');
  checkPage(dashboard.toString('utf8'), 'Embedded staff dashboard');

  if (process.argv.includes('--stage')) {
    const output = 'dist';
    fs.mkdirSync(output, {recursive:true});
    for (const entry of fs.readdirSync('.', {withFileTypes:true})) {
      if (entry.isFile() && /\.(html|webp|mp4|zip)$/i.test(entry.name)) {
        fs.copyFileSync(entry.name, path.join(output, entry.name));
      }
    }
  }
  console.log('Staff workspace validation passed');
} catch (error) {
  console.error('Staff workspace validation failed:', error.message);
  process.exitCode = 1;
}
