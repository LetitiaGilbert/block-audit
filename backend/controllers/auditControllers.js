const blockchain = require("../services/blockchainService");
const { generateFileHash } = require("../utils/hash");

exports.uploadFile = (req, res) => {
  const file = req.file;

  const fileHash = generateFileHash(file.buffer);

  const auditData = {
    filename: file.originalname,
    hash: fileHash,
    timestamp: Date.now(),
  };

  blockchain.addBlock(auditData);

  res.json({
    message: "File added to blockchain",
    hash: fileHash,
  });
};