// backend/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";

import rag from "./rag.js";
import ingest from "./svc-ingest.js";     // <-- NEW
import fast from "./fast.js";
import files from "./files.js";
import stripeWebhook from "./stripe-webhook.js";

const app = express();

const allowed = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: "20mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// dev-only helper
app.post("/auth/dev", (_req, res) => {
  const user = { id: "dev-user", role: "free_user" };
  const token = jwt.sign(user, process.env.JWT_SECRET || "change_me", { expiresIn: "7d" });
  res.json({ token, user });
});

app.use("/ingest", ingest);               // <-- NEW
app.use("/rag", rag);
app.use("/fast", fast);
app.use("/files", files);
app.use("/billing", stripeWebhook);

// demo seed endpoint (already updated with ::vector fix)
import seed from "./tools/seed-endpoint.js";
app.use("/admin", seed);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API up on :" + port));
