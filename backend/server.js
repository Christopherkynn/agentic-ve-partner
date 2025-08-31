import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import rag from "./rag.js";
import fast from "./fast.js";
import files from "./files.js";
import stripeWebhook from "./stripe-webhook.js";

const app = express();

// CORS: allow configured origins (comma list) or all (*)
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

app.use(bodyParser.json());

app.get("/health", (_,res)=>res.json({ ok:true, uptime:process.uptime() }));

// Dev-only helper: issues a JWT quickly (remove in prod)
app.post("/auth/dev", (req,res)=>{
  const user = { id:"dev-user", role:"free_user" };
  const token = jwt.sign(user, process.env.JWT_SECRET || "change_me", { expiresIn: "7d" });
  res.json({ token, user });
});

app.use("/rag", rag);
app.use("/fast", fast);
app.use("/files", files);
app.use("/billing", stripeWebhook);

// Demo seeder for one-click sample
import seed from "./tools/seed-endpoint.js";
app.use("/admin", seed);

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log("API up on :" + port));
