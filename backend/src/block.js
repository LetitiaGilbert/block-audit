import { sha256, getMerkleRoot } from './merkle.js';

export function createGenesisBlock() {
  const block = {
    index: 0,
    timestamp: new Date().toISOString(),
    documents: [],
    merkleRoot: sha256('genesis'),
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: ''
  };
  block.hash = hashBlock(block);
  return block;
}

export function hashBlock(block) {
  const str = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    merkleRoot: block.merkleRoot,
    previousHash: block.previousHash
  });
  return sha256(str);
}

export function createBlock(previousBlock, documents) {
  const docHashes = documents.map(d => d.fileHash);
  const block = {
    index: previousBlock.index + 1,
    timestamp: new Date().toISOString(),
    documents,           // [{ filename, fileHash, uploadedBy, uploadedAt }]
    merkleRoot: getMerkleRoot(docHashes),
    previousHash: previousBlock.hash,
    hash: ''
  };
  block.hash = hashBlock(block);
  return block;
}