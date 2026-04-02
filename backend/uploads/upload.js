import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { addDocumentsToChain } from '/Users/letitiagilbert/audit-prototype/src/chain.js';

const filePath = process.argv[2];
const uploadedBy = process.argv[3] || 'unknown';

if (!filePath) {
  console.log('Usage: node upload.js <filepath> <your-name>');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const filename = path.basename(filePath);

const document = {
  filename,
  fileHash,
  uploadedBy,
  uploadedAt: new Date().toISOString()
};

const block = addDocumentsToChain([document]);

console.log('\n✅ Document added to blockchain');
console.log('─────────────────────────────────────────');
console.log(`File:        ${filename}`);
console.log(`SHA-256:     ${fileHash}`);
console.log(`Uploaded by: ${uploadedBy}`);
console.log(`Block:       #${block.index}`);
console.log(`Block hash:  ${block.hash}`);
console.log(`Timestamp:   ${block.timestamp}`);
console.log('─────────────────────────────────────────');
console.log('This hash is now permanently recorded on the chain.');