import { Router } from "express";
const router = Router();
// Stub: returns 200 so deploys succeed. Add Stripe signature checks in prod.
router.post("/webhook", (req,res)=> res.json({ received:true }));
export default router;
