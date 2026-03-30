const Block = require("../models/block");
const fs = require("fs");

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), "Genesis Block", "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const newBlock = new Block(
      this.chain.length,
      Date.now(),
      data,
      this.getLatestBlock().hash
    );

    this.chain.push(newBlock);
    this.saveChain();
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== prev.hash) return false;
    }
    return true;
  }

  saveChain() {
    fs.writeFileSync(
      "./backend/storage/chain.json",
      JSON.stringify(this.chain, null, 2)
    );
  }
}

module.exports = new Blockchain();