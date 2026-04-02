import express from "express";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());

// ===== Audit Log Schema Helpers =====

const allowedActions = [
    "LOGIN",
    "LOGOUT",
    "CREATE",
    "READ",
    "UPDATE",
    "DELETE"
    ];

    function validateAuditEvent(event) {
    const requiredFields = [
        "userId",
        "action",
        "resource",
        "status"
    ];

    for (let field of requiredFields) {
        if (!event[field]) {
        return `Missing field: ${field}`;
        }
    }

    if (!allowedActions.includes(event.action)) {
        return "Invalid action type";
    }

    if (!["SUCCESS", "FAILURE"].includes(event.status)) {
        return "Invalid status";
    }

    return null;
}

let chain = [];

function isValidChain(chain) {
    if (chain.length === 0) return false;
    const genesis = createGenesisBlock();
    if (JSON.stringify(chain[0]) !== JSON.stringify(genesis)) {
        return false;
    }
    for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const prev = chain[i - 1];

    const recalculatedHash = calculateHash(
        current.id,
        current.index,
        current.timestamp,
        current.data,
        current.previousHash
    );

    if (current.previousHash !== prev.hash) return false;
    if (current.hash !== recalculatedHash) return false;
    }
    return true;
}

const filePath = path.join(__dirname, "chain.json");

    function saveChain() {
    fs.writeFileSync(filePath, JSON.stringify(chain, null, 2));
    }

    function loadChain() {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        chain = JSON.parse(data);
        console.log("Loaded existing chain");
    } catch (err) {
        console.log("No chain found, creating genesis block");
        chain = [createGenesisBlock()];
        saveChain();
    }
    }


function createGenesisBlock() {
    const fixedTimestamp = "2026-01-01T00:00:00.000Z";

    const block = {
    id: "genesis-block-id",
    index: 0,
    timestamp: fixedTimestamp,
    data: "Genesis Block",
    previousHash: "0",
    hash: "genesis-hash"
    };

    block.hash = calculateHash(
    block.id,
    block.index,
    block.timestamp,
    block.data,
    block.previousHash
    );

    return block;
}

loadChain();

function addBlock(data) {
    const block = {
        id: crypto.randomUUID(), // 🔥 missing
        index: chain.length,
        timestamp: new Date().toISOString(),
        data: data,
        previousHash: chain[chain.length - 1].hash
    };

    block.hash = calculateHash(
        block.id,
        block.index,
        block.timestamp,
        block.data,
        block.previousHash
    );

    chain.push(block);   // 🔥 missing
    saveChain();         // 🔥 persist

    return block;        // 🔥 VERY IMPORTANT
}

    app.post("/addLog", (req, res) => {
    const event = req.body;

    // 🔒 Validate event
    const error = validateAuditEvent(event);
    if (error) {
        return res.status(400).json({ error });
    }

    // 🆔 Add system-generated fields
    event.eventId = crypto.randomUUID();
    event.timestamp = new Date().toISOString();
    event.ipAddress = req.ip;
    event.userAgent = req.headers["user-agent"];

    // ⛓ Add to blockchain
    const newBlock = addBlock(event);

    res.json({
        message: "Audit log added successfully",
        block: newBlock
    });
    });

function calculateHash(id, index, timestamp, data, previousHash) {
    return crypto
    .createHash("sha256")
    .update(id + index + timestamp + JSON.stringify(data) + previousHash)
    .digest("hex");
}

app.post("/record", (req, res) => {
    const { hash, filename, uploadedBy } = req.body;
    if (
    typeof hash !== "string" ||
    typeof filename !== "string" ||
    (uploadedBy && typeof uploadedBy !== "string")
) {
    return res.status(400).json({ error: "Invalid input types" });
}

    if (!isValidChain(chain)) {
    return res.status(500).json({ error: "Blockchain corrupted" });
}
    const exists = chain.find(
    block => block.data.fileHash === hash
);

if (exists) {
    return res.status(400).json({ error: "File already recorded" });
}
    const previousBlock = chain[chain.length - 1];

    const newBlock = {
    id: crypto.randomUUID(),
    index: chain.length,
    timestamp: new Date().toISOString(),
    data: {
        fileHash: hash,
        filename,
        uploadedBy
    },
    previousHash: previousBlock.hash
    };

    newBlock.hash = calculateHash(
    newBlock.id,
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
    const valid = isValidChain(chain);
    res.json({ valid });
    });

    app.get("/chain", (req, res) => {
    res.json(chain);
    });

    app.listen(3000, () => {
    console.log("Blockchain service running on port 3000");
    });

    app.get("/", (req, res) => {
    res.send("Blockchain service is running");
});