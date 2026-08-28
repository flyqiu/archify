import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const runtimePath = path.join(repoRoot, 'docs/assets/site-language.js');

function loadRuntime({ search = '', stored = {}, browserLanguage = 'en-US', storageError = false } = {}) {
  const values = new Map(Object.entries(stored));
  const localStorage = {
    getItem(key) {
      if (storageError) throw new Error('storage unavailable');
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (storageError) throw new Error('storage unavailable');
      values.set(key, String(value));
    },
  };
  const window = {
    location: { search },
    localStorage,
    navigator: { language: browserLanguage, languages: [browserLanguage] },
  };
  vm.runInNewContext(fs.readFileSync(runtimePath, 'utf8'), { window, URLSearchParams });
  return { language: window.ArchifySiteLanguage, values };
}

test('site language runtime shares one preference with explicit URL precedence and legacy migration', () => {
  const canonical = loadRuntime({ stored: { 'archify-lang': 'zh' } });
  assert.equal(canonical.language.read(), 'zh');

  const explicit = loadRuntime({ search: '?lang=en', stored: { 'archify-lang': 'zh' } });
  assert.equal(explicit.language.read(), 'en');
  assert.equal(explicit.language.write('en'), 'en');
  assert.equal(explicit.values.get('archify-lang'), 'en');

  const legacy = loadRuntime({ stored: { 'archify-gallery-language': 'zh' } });
  assert.equal(legacy.language.read({ legacyKeys: ['archify-gallery-language'] }), 'zh');
  legacy.language.write('zh');
  assert.equal(legacy.values.get('archify-lang'), 'zh');

  const unsupported = loadRuntime({ search: '?lang=fr', stored: { 'archify-lang': 'zh' } });
  assert.equal(unsupported.language.read(), 'zh');

  const detected = loadRuntime({ browserLanguage: 'zh-CN' });
  assert.equal(detected.language.read({ detectBrowserLanguage: true }), 'zh');

  const blocked = loadRuntime({ browserLanguage: 'en-US', storageError: true });
  assert.equal(blocked.language.read({ detectBrowserLanguage: true }), 'en');
  assert.equal(blocked.language.write('zh'), 'zh');
});

test('all site pages consume the shared language runtime instead of writing private page keys', () => {
  const pages = [
    'docs/index.html',
    'scripts/gallery-template.html',
    'scripts/guide-template.html',
    'scripts/start-template.html',
    'docs/gallery.html',
    'docs/guide.html',
    'docs/start.html',
  ];

  for (const relative of pages) {
    const html = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
    assert.match(html, /<script src="assets\/site-language\.js"><\/script>/, `${relative}: shared runtime missing`);
    assert.match(html, /ArchifySiteLanguage\.read\(/, `${relative}: shared language read missing`);
    assert.match(html, /ArchifySiteLanguage\.write\(/, `${relative}: shared language write missing`);
    assert.doesNotMatch(
      html,
      /localStorage\.setItem\(['"]archify-(?:lang|gallery-language|guide-language)['"]/,
      `${relative}: page bypasses the shared language writer`,
    );
  }
});
