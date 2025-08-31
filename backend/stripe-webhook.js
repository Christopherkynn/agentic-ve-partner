import { Router } from 'express'; const r=Router(); r.post('/webhook',(_,res)=>res.json({received:true})); export default r;
