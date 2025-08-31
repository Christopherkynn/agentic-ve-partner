import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export default function Home() {
  const [projectId, setProjectId] = useState("");
  const [question, setQuestion] = useState("List key geometric and environmental constraints with citations.");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(null);

  const seed = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/admin/seed`, {method:"POST"});
      const data = await res.json();
      setProjectId(data.projectId);
      setSeeded(data);
    } finally { setBusy(false); }
  };

  const ask = async () => {
    if (!projectId) { alert("Enter a projectId (or click Seed Sample)"); return; }
    setBusy(true); setAnswer(""); setSources([]);
    try {
      const res = await fetch(`${API_BASE}/rag/query`, {
        method:"POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, question, phase:"Information" })
      });
      const data = await res.json();
      setAnswer(data.answer || "");
      setSources(data.topSources || []);
    } finally { setBusy(false); }
  };

  return (
    <main style={{maxWidth:880, margin:"40px auto", fontFamily:"system-ui"}}>
      <h1>Agentic VE Partner — Minimal UI</h1>
      <p>Backend: <code>{API_BASE || "(same origin)"}</code></p>

      <div style={{marginTop:20, padding:12, border:"1px solid #ccc", borderRadius:8}}>
        <button onClick={seed} disabled={busy}>Seed Sample Project</button>
        {seeded && <div style={{marginTop:8}}>
          <div><b>projectId</b>: {seeded.projectId}</div>
          <div><b>docId</b>: {seeded.docId}</div>
        </div>}
      </div>

      <div style={{marginTop:20, padding:12, border:"1px solid #ccc", borderRadius:8}}>
        <label>Project ID</label><br/>
        <input value={projectId} onChange={e=>setProjectId(e.target.value)} style={{width:"100%"}} placeholder="paste or seed"/>
        <label style={{marginTop:12, display:"block"}}>Question</label>
        <textarea rows={4} value={question} onChange={e=>setQuestion(e.target.value)} style={{width:"100%"}}/>
        <div style={{marginTop:12}}>
          <button onClick={ask} disabled={busy}>Ask</button>
        </div>
      </div>

      <div style={{marginTop:20, padding:12, border:"1px solid #ccc", borderRadius:8}}>
        <h3>Answer</h3>
        <pre style={{whiteSpace:"pre-wrap"}}>{answer}</pre>
        <h4>Top Sources</h4>
        <ul>
          {sources.map((s, i)=>(
            <li key={i}><b>{s.name}</b> — score {s.score?.toFixed(3)}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
