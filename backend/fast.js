import { Router } from "express";
const router = Router();

// Stubs — replace with your real FastDiagram microservice when ready
router.get("/nodes", (req,res)=> res.json([]));
router.post("/seed", (req,res)=> res.json({ ok:true, message:"Seed FAST not implemented yet" }));
router.post("/layout", (req,res)=> res.json({ ok:true, message:"Layout not implemented yet" }));
router.post("/export", (req,res)=> res.json({ ok:true, url:null }));

export default router;
