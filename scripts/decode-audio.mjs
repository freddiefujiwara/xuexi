// audio-src/*.mp3.b64（Base64テキスト）を public/audio/*.mp3 に復元する。
// GitHub MCP の push_files がテキストしか送れないため、音声は Base64 で
// リポジトリに置き、ビルド時に MP3 へ戻す。
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function decodeAll(srcDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.mp3.b64'));
  for (const f of files) {
    const b64 = readFileSync(join(srcDir, f), 'utf8').replace(/\s+/g, '');
    writeFileSync(join(outDir, f.replace(/\.b64$/, '')), Buffer.from(b64, 'base64'));
  }
  return files.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const n = decodeAll(join(root, 'audio-src'), join(root, 'public', 'audio'));
  console.log(`decoded ${n} audio files`);
}
