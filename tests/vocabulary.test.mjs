import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkVocabulary} from '../scripts/check-vocabulary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const retired = ['pay', 'load'].join('');

test('all repository guidance, code and generated text use entity bytes vocabulary', async () => {
  const result = await checkVocabulary(root);
  assert.deepEqual(result.failures, []);
  assert.ok(result.files > 0);
});

test('vocabulary CLI rejects injected prose, code, generated data, snapshots and resource names', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'arkiv-vocabulary-'));
  try {
    const cases = [
      ['skills/example/SKILL.md', '# Entity bytes', `# Entity ${retired.toUpperCase()}`],
      ['scripts/seed.mjs', 'const entityBytes = [];', `const entity${retired} = [];`],
      ['generated/entities.json', '{"column":"bytes"}', JSON.stringify({column: retired})],
      ['captures/current.snap', 'Bytes column', `Entity ${retired}`],
      [`references/sdk-${retired}.md`, null, '# Entity bytes'],
      ...['names', 'sources', 'file', 'sourcesContent', 'sourceRoot', 'x_extension'].map(field => ['generated/source.js.map', '{}', JSON.stringify({version: 3, names: [], sources: [], sourcesContent: [], mappings: '', [field]: field === 'file' || field === 'sourceRoot' ? retired : [retired]})]),
      ['generated/uppercase.MAP', '{}', '{"sourceRoot":"' + String.fromCharCode(92) + 'u0070' + retired.slice(1) + '"}'],
      ['generated/indexed.js.map', '{}', JSON.stringify({version: 3, sections: [{offset: {line: 0, column: 0}, map: {version: 3, sourceRoot: retired, names: [], sources: [], sourcesContent: [], mappings: ''}}]})],
      ['generated/escaped.js.map', '{}', '{"names":["' + String.fromCharCode(92) + 'u0070' + retired.slice(1) + '"]}'],
      ['writer/new-component.ts', 'export const bytes = [];', `export const ${retired} = [];`],
      ['practice-map/capture.json', '{}', JSON.stringify({label: retired})],
      ['writer/src/phase-zero.ts', null, `const ${retired} = [];`],
    ];
    for (let index = 0; index < cases.length; index++) {
      const [file, clean, mutation] = cases[index];
      const fixture = path.join(scratch, String(index));
      await mkdir(path.dirname(path.join(fixture, file)), {recursive: true});
      const invoke = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-vocabulary.mjs'), fixture], {encoding: 'utf8'});
      if (clean !== null) {
        await writeFile(path.join(fixture, file), clean);
        assert.equal(invoke().status, 0, `${file}: positive control`);
      }
      await writeFile(path.join(fixture, file), mutation);
      const rejected = invoke();
      assert.equal(rejected.status, 1, `${file}: mutation must fail`);
      assert.equal(JSON.parse(rejected.stdout).passed, false);
    }
  } finally {
    assert.equal(path.dirname(scratch), tmpdir());
    assert.ok(path.basename(scratch).startsWith('arkiv-vocabulary-'));
    await rm(scratch, {recursive: true});
  }
});

test('content scan rejects schema.sql bypass with a clean control', async () => {
  const {mkdtemp, writeFile, rm} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const path = await import('node:path');
  const {spawnSync} = await import('node:child_process');
  const scratch = await mkdtemp(path.join(tmpdir(), 'surf2-vocabulary-'));
  const term = ['pay', 'load'].join('');
  try {
    const target = path.join(scratch, 'schema.sql');
    await writeFile(target, "SELECT 1;");
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-vocabulary.mjs'), scratch], {encoding:'utf8'});
    assert.equal(run().status, 0, 'clean text must pass');
    await writeFile(target, 'SELECT '+term);
    const rejected = run();
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.equal(JSON.parse(rejected.stdout).passed, false);
  } finally { await rm(scratch, {recursive:true}); }
});

test('content scan rejects NOTICE bypass with a clean control', async () => {
  const {mkdtemp, writeFile, rm} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const path = await import('node:path');
  const {spawnSync} = await import('node:child_process');
  const scratch = await mkdtemp(path.join(tmpdir(), 'surf2-vocabulary-'));
  const term = ['pay', 'load'].join('');
  try {
    const target = path.join(scratch, 'NOTICE');
    await writeFile(target, "Entity bytes");
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-vocabulary.mjs'), scratch], {encoding:'utf8'});
    assert.equal(run().status, 0, 'clean text must pass');
    await writeFile(target, 'Entity '+term);
    const rejected = run();
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.equal(JSON.parse(rejected.stdout).passed, false);
  } finally { await rm(scratch, {recursive:true}); }
});

test('content scan rejects events.jsonl bypass with a clean control', async () => {
  const {mkdtemp, writeFile, rm} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const path = await import('node:path');
  const {spawnSync} = await import('node:child_process');
  const scratch = await mkdtemp(path.join(tmpdir(), 'surf2-vocabulary-'));
  const term = ['pay', 'load'].join('');
  try {
    const target = path.join(scratch, 'events.jsonl');
    await writeFile(target, "{\"nested\":{\"name\":\"bytes\"}}");
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-vocabulary.mjs'), scratch], {encoding:'utf8'});
    assert.equal(run().status, 0, 'clean text must pass');
    await writeFile(target, '{"nested":{"name":"'+String.fromCharCode(92)+'u0070'+term.slice(1)+'"}}');
    const rejected = run();
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.equal(JSON.parse(rejected.stdout).passed, false);
  } finally { await rm(scratch, {recursive:true}); }
});

test('content scan rejects NOTICE_JSONL bypass with a clean control', async () => {
  const {mkdtemp, writeFile, rm} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const path = await import('node:path');
  const {spawnSync} = await import('node:child_process');
  const scratch = await mkdtemp(path.join(tmpdir(), 'surf2-vocabulary-'));
  const term = ['pay', 'load'].join('');
  try {
    const target = path.join(scratch, 'NOTICE_JSONL');
    await writeFile(target, '{}\n' + "{\"nested\":{\"name\":\"bytes\"}}");
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-vocabulary.mjs'), scratch], {encoding:'utf8'});
    assert.equal(run().status, 0, 'clean text must pass');
    await writeFile(target, '{"nested":{"name":"'+String.fromCharCode(92)+'u0070'+term.slice(1)+'"}}');
    const rejected = run();
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.equal(JSON.parse(rejected.stdout).passed, false);
  } finally { await rm(scratch, {recursive:true}); }
});
