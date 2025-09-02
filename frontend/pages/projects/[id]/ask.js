import { useRouter } from 'next/router';
import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function AskPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState([]);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!projectId || !question) return alert('Enter a question');
    setBusy(true);
    try {
      const res = await axios.post(`${API_BASE}/ask`, { projectId, question }, { withCredentials: true });
      setAnswer(res.data.answer);
      setCitations(res.data.citations || []);
    } catch (err) {
      console.error(err);
      alert('Failed to get answer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Ask Questions</h1>
      <p>Project ID: {projectId}</p>
      <textarea
        rows={4}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ width: '100%' }}
        placeholder="Enter your question about the uploaded documents"
      />
      <button onClick={ask} disabled={busy}>Ask</button>
      {answer && (
        <div style={{ marginTop: 20 }}>
          <h3>Answer</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{answer}</pre>
          <h4>Citations</h4>
          <ul>
            {citations.map((c, i) => (
              <li key={i}>Source {c.source}: {c.fileName} (chunk {c.chunk})</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}