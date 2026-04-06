import express from "express";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import axios from "axios";
import jwt from "jsonwebtoken";

const app = express();

let peers = [];

app.use(helmet());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100
});

app.use(limiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SECRET_KEY = process.env.SECRET_KEY || "dev-secret-key";
const JWT_SECRET = process.env.JWT_SECRET || "jwt-dev-secret-key";
app.use(cors());
app.use(express.json());

const usersFilePath = path.join(__dirname, "users.json");

let users = {
    admin: { password: "password", role: "admin" },
    auditor: { password: "auditor123", role: "auditor" },
    employee: { password: "employee123", role: "employee" }
};

function saveUsers() {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

function loadUsers() {
    try {
        const data = fs.readFileSync(usersFilePath, "utf8");
        users = JSON.parse(data);
        console.log("Loaded existing users");
    } catch (err) {
        console.log("No user file found, initializing default users");
        saveUsers();
    }
}

loadUsers();

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const user = users[username];

    if (user && user.password === password) {
        const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

app.post("/users", auth, authorize("admin"), (req, res) => {
    const { username, role, password } = req.body;

    if (!username || !role) {
        return res.status(400).json({ error: "Username and role are required" });
    }

    if (users[username]) {
        return res.status(409).json({ error: "User already exists" });
    }

    const safePassword = password && password.trim().length > 0 ? password.trim() : `welcome-${username}`;
    users[username] = { password: safePassword, role };
    saveUsers();

    res.json({ username, role, password: safePassword, message: "User created" });
});

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
    // Just check the genesis hash is internally consistent
    const genesis = chain[0];
    const expectedGenesisHash = calculateHash(
        genesis.id,
        genesis.index,
        genesis.timestamp,
        genesis.data,
        genesis.previousHash,
        genesis.nonce
    );

    if (genesis.hash !== expectedGenesisHash) return false;

    const expectedGenesisSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(genesis.hash)
    .digest("hex");

    if (genesis.signature !== expectedGenesisSig) return false;

    for (let i = 1; i < chain.length; i++) {
        const current = chain[i];
        const prev = chain[i - 1];
        const recalculated = calculateHash(
    current.id,
    current.index,
    current.timestamp,
    current.data,
    current.previousHash,
    current.nonce
);
        if (current.previousHash !== prev.hash) return false;
        if (current.hash !== recalculated) return false;
        if (current.index !== i) return false;
        if (new Date(current.timestamp) <= new Date(prev.timestamp)) {
            return false;
        }

        const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(current.hash)
    .digest("hex");

    if (current.signature !== expectedSig) return false;
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

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid token" });
    }
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}

function createGenesisBlock() {
    const hash = calculateHash(
        "genesis-block-id",
        0,
        "2026-01-01T00:00:00.000Z",
        "Genesis Block",
        "0",
        0
    );

    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(hash)
        .digest("hex");

    return {
        id: "genesis-block-id",
        index: 0,
        timestamp: "2026-01-01T00:00:00.000Z",
        data: "Genesis Block",
        previousHash: "0",
        hash,
        nonce: 0,
        signature
    };
}

loadChain();

async function syncChain() {
    for (let peer of peers) {
        try {
            const res = await axios.get(`${peer}/chain`);
            const theirChain = res.data;

            if (theirChain.length > chain.length && isValidChain(theirChain)) {
                chain = theirChain;
                saveChain();
            }
        } catch (err) {
            console.log("Peer unreachable");
        }
    }
}

setInterval(syncChain, 10000);

function mineBlock(block, difficulty = 3) {
    let nonce = 0;
    let hash;

    do {
        nonce++;
        hash = calculateHash(
    block.id,
    block.index,
    block.timestamp,
    block.data,
    block.previousHash,
    nonce
);
    } while (!hash.startsWith("0".repeat(difficulty)));

    return { hash, nonce };
}

function addBlock(data) {
    const block = {
        id: crypto.randomUUID(), // 🔥 missing
        index: chain.length,
        timestamp: new Date().toISOString(),
        data: data,
        previousHash: chain[chain.length - 1].hash
    };

    const mined = mineBlock(block);
    block.hash = mined.hash;
    block.nonce = mined.nonce;

    block.signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(block.hash)
    .digest("hex");

    chain.push(block);   // 🔥 missing
    saveChain();         // 🔥 persist

    return block;        // 🔥 VERY IMPORTANT
}

app.post("/addLog", auth, authorize("employee","admin"), (req, res) => {
    const event = req.body;

    if (req.user.role === "employee") {
        event.userId = req.user.username;
    }

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

function calculateHash(id, index, timestamp, data, previousHash, nonce = 0) {
    return crypto
        .createHash("sha256")
        .update(id + index + timestamp + JSON.stringify(data) + previousHash + nonce)
        .digest("hex");
}

app.post("/record", auth, authorize("employee","admin"),  (req, res) => {
    const { hash, filename, uploadedBy } = req.body;

    if (typeof hash !== "string" || typeof filename !== "string") {
        return res.status(400).json({ error: "Invalid input types" });
    }

    if (!isValidChain(chain)) {
        return res.status(500).json({ error: "Blockchain corrupted" });
    }

    const exists = chain.find(block =>
        block.data && block.data.fileHash === hash
    );
    if (exists) {
        return res.status(400).json({ error: "File already recorded" });
    }

    const newBlock = addBlock({ fileHash: hash, filename, uploadedBy });

    res.json({
        message: "Block added",
        blockNumber: newBlock.index,
        blockHash: newBlock.hash
    });
    });

app.post("/addPeer", auth, authorize("admin"), (req, res) => {
    if (!peers.includes(req.body.peer)){
        peers.push(req.body.peer);
    }
    res.json({ message: "Peer added" });
});

app.get("/verify/:hash", auth, authorize("auditor","admin"), (req, res) => {
    const found = chain.find(
        block => block.data.fileHash === req.params.hash
    );

    res.json({
        exists: !!found,
        block: found || null
    });
    });

app.get("/verify", auth, authorize("auditor","admin"), (req, res) => {
    const valid = isValidChain(chain);
    res.json({ valid });
    });

app.get("/chain", auth, (req, res) => {
    // Employees can still view the full chain in the UI, while personal activity is tied to their own username.
    res.json(chain);
});

app.get("/logs", auth, authorize("auditor","admin"), (req, res) => {
    const { userId, action } = req.query;

    let results = chain;

    if (userId) {
        results = results.filter(b => b.data &&b.data.userId === userId);
    }

    if (action) {
        results = results.filter(b => b.data && b.data.action === action);
    }

    res.json(results);
});

app.get("/", (req, res) => {
    res.send("Blockchain service is running");
});

app.listen(3000, () => {
    console.log("Blockchain service running on port 3000");
});