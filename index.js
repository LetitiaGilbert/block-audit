import express from "express";
import multer from "multer";
import * as crypto from "crypto";
import * as fs from "fs";
import fetch from "node-fetch"; // npm install node-fetch@2

const app = express();
const upload = multer({ dest: "uploads/" });

// CORS so frontend can call this directly
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  fs.unlinkSync(filePath);

  // Record hash on the blockchain
  let chainResult = null;
  try {
    const response = await fetch("http://localhost:3000/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hash: hash,
        filename: req.file.originalname,
        uploadedBy: req.body.uploadedBy || "unknown"
      })
    });
    chainResult = await response.json();
  } catch (err) {
    console.error("Chain recording failed:", err.message);
  }

  res.json({
    fileName: req.file.originalname,
    hash: hash,
    chain: chainResult
  });
});

app.listen(4000, () => {
  console.log("Hashing API running on http://localhost:4000");
});