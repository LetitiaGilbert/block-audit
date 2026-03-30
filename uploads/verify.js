import fs from 'fs';
import crypto from 'crypto';
import { loadChain, verifyChain, findDocument } from '/Users/letitiagilbert/audit-prototype/src/chain.js';

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node verify.js <filepath>');
  process.exit(1);
}

const chain = loadChain();
const fileBuffer = fs.readFileSync(filePath);
const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

console.log('\n🔍 Verifying document...');
console.log('─────────────────────────────────────────');
console.log(`File:    ${filePath}`);
console.log(`SHA-256: ${fileHash}`);

// Step 1: verify chain integrity
const chainCheck = verifyChain(chain);
if (!chainCheck.valid) {
  console.log(`\n❌ CHAIN COMPROMISED at block #${chainCheck.failedAt}`);
  console.log(`   Reason: ${chainCheck.reason}`);
  process.exit(1);
}
console.log(`\n✅ Chain integrity verified (${chainCheck.blocksChecked} blocks checked)`);

// Step 2: find this document's hash in the chain
const result = findDocument(fileHash, chain);
if (!result) {
  console.log('\n❌ DOCUMENT NOT FOUND on chain — file may have been modified or never uploaded');
  process.exit(1);
}

const { document, block } = result;
console.log('\n✅ Document hash found on chain');
console.log('─────────────────────────────────────────');
console.log(`Uploaded by: ${document.uploadedBy}`);
console.log(`Uploaded at: ${document.uploadedAt}`);
console.log(`Block:       #${block.index}`);
console.log(`Block hash:  ${block.hash}`);
console.log('\n✅ VERIFIED — this document is authentic and unmodified');