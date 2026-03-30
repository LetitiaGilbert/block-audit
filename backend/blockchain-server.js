import express from "express";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let chain = [];

function saveChain() {
  fs.writeFileSync("chain.json", JSON.stringify(chain, null, 2));
}

function loadChain() {
  try {
    const data = fs.readFileSync("chain.json");
    chain = JSON.parse(data);
  } catch {
    chain = [createGenesisBlock()];
  }
}


function createGenesisBlock() {
  const block = {
    index: 0,
    timestamp: Date.now(),
    data: "Genesis Block",
    previousHash: "0"
  };

  block.hash = calculateHash(
    block.index,
    block.timestamp,
    block.data,
    block.previousHash
  );

  return block;
}

loadChain();

function calculateHash(index, timestamp, data, previousHash) {
  return crypto
    .createHash("sha256")
    .update(index + timestamp + JSON.stringify(data) + previousHash)
    .digest("hex");
}

app.post("/record", (req, res) => {
  const { hash, filename, uploadedBy } = req.body;
  if (!hash || !filename) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const previousBlock = chain[chain.length - 1];

  const newBlock = {
    index: chain.length,
    timestamp: Date.now(),
    data: {
      fileHash: hash,
      filename,
      uploadedBy
    },
    previousHash: previousBlock.hash
  };

  newBlock.hash = calculateHash(
    newBlock.index,
    newBlock.timestamp,
    newBlock.data,
    newBlock.previousHash
  );

  chain.push(newBlock);
  saveChain();

  res.json({
    message: "Block added",
    blockNumber: newBlock.index,
    blockHash: newBlock.hash
  });
});

app.get("/verify/:hash", (req, res) => {
  const found = chain.find(
    block => block.data.fileHash === req.params.hash
  );

  res.json({
    exists: !!found,
    block: found || null
  });
});

app.get("/verify", (req, res) => {
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const previous = chain[i - 1];

    const recalculatedHash = calculateHash(
      current.index,
      current.timestamp,
      current.data,
      current.previousHash
    );

    if (current.hash !== recalculatedHash) {
      return res.json({ valid: false });
    }

    if (current.previousHash !== previous.hash) {
      return res.json({ valid: false });
    }
  }

  res.json({ valid: true });
});

app.get("/chain", (req, res) => {
  res.json(chain);
});

app.listen(3000, () => {
  console.log("Blockchain service running on port 3000");
});