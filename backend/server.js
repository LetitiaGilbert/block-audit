import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import cors from 'cors';
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json()); // Add this for JSON body parsing

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf", "text/plain"];
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".pdf", ".txt"];

    if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error("Invalid file type. Allowed: PNG, JPG, PDF, TXT"));
    }

    cb(null, true);
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Record on blockchain
    let chainResult = null;
    try {
      const response = await fetch("http://localhost:3000/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: hash,
          filename: req.file.originalname,
          uploadedBy: req.body.uploadedBy || "unknown",
          filePath: req.file.filename, // Store the unique filename
          size: req.file.size,
          mimetype: req.file.mimetype,
          timestamp: Date.now()
        })
      });
      if (!response.ok) {
        throw new Error(`Blockchain server error: ${response.status}`);
      }
      chainResult = await response.json();
    } catch (err) {
      console.error("Blockchain recording failed:", err.message);
      // Clean up file if blockchain fails
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: "Failed to record on blockchain" });
    }

    res.json({
      message: "File uploaded and recorded successfully",
      fileName: req.file.originalname,
      storedName: req.file.filename,
      hash: hash,
      size: req.file.size,
      chain: chainResult
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hashing API is running. Use POST /upload to submit files.");
});

app.listen(4000, () => {  // changed to 4000 so it doesn't clash with your chain on 3000
  console.log("Hashing API running on port 4000");
});
