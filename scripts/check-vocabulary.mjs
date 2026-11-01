import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

// Assemble the retired term so the guard's own source follows the vocabulary rule.
const retired = new RegExp(['pay', 'load'].join(''), 'i');
const omitted = new Set(['.git', 'node_modules', '.next', 'out', 'out-swarm', 'dist', 'coverage', 'test-results', 'playwright-report']);
const policy = JSON.parse(await readFile(new URL('./vocabulary-exceptions.json', import.meta.url), 'utf8'));

export async function checkVocabulary(root) {
  const failures = [];
  let files = 0;
  async function visit(relative = '') {
    for (const entry of await readdir(path.join(root, relative), {withFileTypes: true})) {
      if (omitted.has(entry.name)) continue;
      const file = path.posix.join(relative, entry.name);
      if (/^\.env(?:\.|$)/.test(entry.name)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Vocabulary scan refuses symlinks: ${file}`);
      if (retired.test(file)) failures.push({file, line: 0, rule: 'resource-name'});
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        files++;
        let text;
        try { text = new TextDecoder('utf-8', {fatal:true}).decode(await readFile(path.join(root, file))); } catch { continue; }
        text = text.replace(/\r\n/g, '\n');
        const frozen = policy.frozen.find(entry => entry.file === file);
        if (frozen) {
          const sha256 = createHash('sha256').update(text).digest('hex');
          if (sha256 !== frozen.sha256) failures.push({file, line: 1, rule: 'retired-evidence-changed'});
          continue;
        }
        const lines = text.split('\n');
        for (let index = 0; index < lines.length; index++) {
          if (retired.test(lines[index])) failures.push({file, line: index + 1, rule: 'entity-vocabulary'});
        }
        if (/\.(?:jsonl?|map)$/i.test(file) || /^[\s]*[\[{"]/.test(text)) {
          try {
            function inspect(value) {
              if (typeof value === 'string' && retired.test(value)) failures.push({file, line: 1, rule: 'json-string'});
              else if (Array.isArray(value)) value.forEach(inspect);
              else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
                if (retired.test(key)) failures.push({file, line: 1, rule: 'json-field'});
                inspect(item);
              }
            }
            let value;
            try { value = JSON.parse(text); } catch {
              if (/\.(?:json|map)$/i.test(file)) throw new Error('Invalid JSON');
              value = text.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
            }
            inspect(value);
          } catch { if (/\.(?:jsonl?|map)$/i.test(file)) failures.push({file, line: 1, rule: 'invalid-json'}); }
        }
      }
    }
  }
  await visit();
  return {passed: failures.length === 0, files, failures};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await checkVocabulary(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
