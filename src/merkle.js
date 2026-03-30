import crypto from 'crypto';

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function getMerkleRoot(hashes) {
  if (hashes.length === 0) return sha256('empty');
  let layer = [...hashes];
  while (layer.length > 1) {
    if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1]);
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(sha256(layer[i] + layer[i + 1]));
    }
    layer = next;
  }
  return layer[0];
}