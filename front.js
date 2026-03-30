// File upload
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("uploadedBy", "alice"); // or whoever is logged in

const response = await fetch("http://localhost:4000/upload", {
  method: "POST",
  body: formData
});
const result = await response.json();
// result.hash — the SHA-256 hash
// result.chain.block.index — which block it landed in
// result.chain.block.hash — the block hash


// Fetch all blocks for the dashboard
const chain = await fetch("http://localhost:3000/chain").then(r => r.json());
// chain.blocks — array of all blocks


// Verify a file
const hash = "abc123..."; // recomputed hash of the file
const verification = await fetch(`http://localhost:3000/verify/${hash}`).then(r => r.json());
// verification.verified — true/false
// verification.document.uploadedBy
// verification.document.uploadedAt