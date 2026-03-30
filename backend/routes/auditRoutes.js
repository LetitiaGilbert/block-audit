const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const auditController = require("../controllers/auditController");

router.post("/upload", upload.single("file"), auditController.uploadFile);

module.exports = router;