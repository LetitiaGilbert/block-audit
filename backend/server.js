import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import cors from 'cors';


const app = express();
app.use(cors());
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }

    cb(null, true);
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  fs.unlinkSync(filePath);

  // ── NEW: record hash on your chain ──────────────────
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
  // ────────────────────────────────────────────────────

  res.json({
    fileName: req.file.originalname,
    hash: hash,
    chain: chainResult  // includes block number, block hash, timestamp
  });
});

app.get("/", (req, res) => {
  res.send("Hashing API is running. Use POST /upload to submit files.");
});

app.listen(4000, () => {  // changed to 4000 so it doesn't clash with your chain on 3000
  console.log("Hashing API running on port 4000");
});
