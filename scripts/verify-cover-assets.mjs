import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/covers/manifest.json'), 'utf8'));
const photoManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/photos/manifest.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'src/media.ts'), 'utf8');
const match = source.match(/const registry: Record<string, GarmentMedia> = ([\s\S]*?);\nexport const PHOTO_IDS/);
assert(match, 'Original photo registry remains machine-readable');
const registry = JSON.parse(match[1]);
const originals = new Map(photoManifest.items.map(item => [item.id, item]));

function inspectWebp(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', 'WebP RIFF signature');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', 'WebP format signature');
  for (let offset = 12; offset + 8 < buffer.length;) {
    const kind = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4), start = offset + 8;
    if (kind === 'VP8X') return {
      width: 1 + buffer.readUIntLE(start + 4, 3),
      height: 1 + buffer.readUIntLE(start + 7, 3),
      alpha: Boolean(buffer[start] & 0x10),
    };
    if (kind === 'VP8L') {
      assert.equal(buffer[start], 0x2f);
      const bits = buffer.readUInt32LE(start + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alpha: Boolean(bits & 0x10000000) };
    }
    offset = start + size + (size % 2);
  }
  throw new Error('A cover must be WebP with an alpha-capable header');
}

assert.equal(manifest.items.length, 13, '12 catalogue covers and 1 private reference cover');
assert.equal(new Set(manifest.items.map(item => item.listingId)).size, 13, 'Unique cover IDs');
assert.equal(new Set(manifest.items.map(item => item.src)).size, 13, 'Unique cover paths');
let totalBytes = 0;
for (const cover of manifest.items) {
  assert(registry[cover.listingId], 'Cover has an original garment set');
  assert.equal(cover.src, `/covers/${cover.listingId}.webp`, 'Stable local cover path');
  assert.equal(cover.kind, 'ai-reconstructed-demo', 'Generated imagery is explicitly identified');
  assert.equal(cover.conditionProof, false, 'Generated imagery is never condition proof');
  assert.equal(cover.transparent, true, 'Shared UI background remains visible');
  const original = originals.get(cover.sourcePhotoId);
  assert(original, 'Original source photograph provenance exists');
  assert.equal(original.listingId, cover.listingId, 'Cover and source garment agree');
  assert.equal(original.sha256, cover.sourceSha256, 'Source provenance matches original manifest');
  assert(registry[cover.listingId].photos.some(photo => photo.id === cover.sourcePhotoId), 'Source stays in listing gallery');
  assert(registry[cover.listingId].photos.every(photo => photo.src.startsWith('/photos/')), 'Generated covers stay out of source photo gallery');
  const buffer = fs.readFileSync(path.join(root, 'public', cover.src));
  assert.equal(buffer.length, cover.bytes, 'Cover byte length');
  assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), cover.sha256, 'Cover SHA-256');
  const decoded = inspectWebp(buffer);
  assert.deepEqual([decoded.width, decoded.height], [800, 1000], 'Uniform 4:5 cover dimensions');
  assert(decoded.alpha, 'Cover retains an alpha channel');
  assert.deepEqual([cover.width, cover.height], [800, 1000], 'Metadata agrees with decoded cover dimensions');
  totalBytes += buffer.length;
}
const files = fs.readdirSync(path.join(root, 'public/covers')).filter(file => file.endsWith('.webp'));
assert.equal(files.length, manifest.items.length, 'Every runtime cover has a manifest record');
console.log(JSON.stringify({ ok: true, covers: manifest.items.length, bytes: totalBytes, format: 'WebP with alpha', dimensions: [800, 1000], originalsPreserved: true, checked: ['paths', 'source associations', 'source gallery separation', 'dimensions', 'alpha header', 'byte lengths', 'SHA-256', 'demo provenance'] }, null, 2));
