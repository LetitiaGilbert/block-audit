import fs from 'fs';
import { createGenesisBlock, createBlock, hashBlock } from './block.js';

const CHAIN_FILE = './chain.json';

export function loadChain() {
  if (!fs.existsSync(CHAIN_FILE)) {
    const genesis = createGenesisBlock();
    saveChain([genesis]);
    return [genesis];
  }
  return JSON.parse(fs.readFileSync(CHAIN_FILE, 'utf8'));
}

export function saveChain(chain) {
  fs.writeFileSync(CHAIN_FILE, JSON.stringify(chain, null, 2));
}

export function addDocumentsToChain(documents) {
  const chain = loadChain();
  const latest = chain[chain.length - 1];
  const block = createBlock(latest, documents);
  chain.push(block);
  saveChain(chain);
  return block;
}

export function verifyChain(chain) {
  for (let i = 1; i < chain.length; i++) {
    const block = chain[i];
    const prev = chain[i - 1];

    // Recompute this block's hash
    if (block.hash !== hashBlock(block)) {
      return { valid: false, failedAt: i, reason: 'block hash mismatch — block was tampered with' };
    }

    // Check it links to previous
    if (block.previousHash !== prev.hash) {
      return { valid: false, failedAt: i, reason: 'broken chain link — previous hash does not match' };
    }
  }
  return { valid: true, blocksChecked: chain.length };
}

export function findDocument(fileHash, chain) {
  for (const block of chain) {
    const found = block.documents.find(d => d.fileHash === fileHash);
    if (found) return { document: found, block };
  }
  return null;
}