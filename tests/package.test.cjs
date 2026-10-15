const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const manifest = require('../package.json');
const { GbpPeak, GbpPeakApi } = require('../dist/index.js');

test('every n8n manifest entry and the public entry point load', () => {
  assert.equal(typeof GbpPeak, 'function');
  assert.equal(typeof GbpPeakApi, 'function');
  for (const file of [...manifest.n8n.credentials, ...manifest.n8n.nodes, manifest.main]) {
    assert.ok(existsSync(path.join(root, file)), file);
    assert.ok(Object.keys(require(path.join(root, file))).length > 0, file);
  }
});

test('the built node icon is identical to its source', () => {
  const node = new GbpPeak();
  const icon = node.description.icon.replace(/^file:/, '');
  assert.deepEqual(
    readFileSync(path.join(root, 'dist', 'nodes', 'GbpPeak', icon)),
    readFileSync(path.join(root, 'nodes', 'GbpPeak', icon)),
  );
});

test('credentials add Bearer authentication and preserve other headers', async () => {
  const credential = new GbpPeakApi();
  const request = await credential.authenticate({ apiToken: 'synthetic-test-token' }, {
    method: 'GET', url: 'https://example.invalid', headers: { Accept: 'application/json' },
  });
  assert.deepEqual(request.headers, {
    Accept: 'application/json', Authorization: 'Bearer synthetic-test-token',
  });
  assert.equal(credential.properties[0].typeOptions.password, true);
  assert.equal(credential.test.request.method, 'GET');
});
