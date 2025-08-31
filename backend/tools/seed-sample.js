import { pool } from "../db.js";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main(){
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const projectId = uuidv4();
    const docId = uuidv4();

    await client.query("INSERT INTO projects(id,name) VALUES ($1,$2)", [projectId, "Sample Project"]);
    await client.query("INSERT INTO documents(id,project_id,name) VALUES ($1,$2,$3)", [docId, projectId, "Constraints.txt"]);

    const text = `
Right-of-way (ROW) is restricted along the east side; avoid widening beyond 2 ft.
Bridge clearance must be maintained at 16 ft minimum.
Design speed is 45 mph; target LOS C at opening year.
Floodplain impacts must not increase BFE; follow local stormwater criteria.
Pedestrian crossing required at Station 23+50 with ADA ramps both sides.
`;

    const pieces = text.trim().split(/\n/).map((t,i)=>({ idx:i, content:t }));
    const e = await openai.embeddings.create({ model:"text-embedding-3-large", input: pieces.map(p=>p.content) });

    for(let i=0;i<pieces.length;i++){
      await client.query(
        "INSERT INTO chunks(document_id, idx, content, embedding) VALUES ($1,$2,$3,$4)",
        [docId, pieces[i].idx, pieces[i].content, e.data[i].embedding]
      );
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ projectId, docId }, null, 2));
  } catch (err){
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}
main();
