import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function IdeasPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [ideas, setIdeas] = useState([]);
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchIdeas = async () => {
    if (!projectId) return;
    try {
      const res = await axios.get(`${API_BASE}/ideas/${projectId}`, { withCredentials: true });
      setIdeas(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchIdeas(); }, [projectId]);

  const generate = async () => {
    if (!focus) return alert('Enter a focus');
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/ideas/${projectId}/generate`, { focus }, { withCredentials: true });
      setFocus('');
      await fetchIdeas();
    } catch (err) {
      console.error(err);
      alert('failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Creative Ideas</h1>
      <p>Project ID: {projectId}</p>
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Focus for idea generation"
          style={{ width: '70%', marginRight: '10px' }}
        />
        <button onClick={generate} disabled={loading}>Generate Ideas</button>
      </div>
      <ul>
        {ideas.map(i => (
          <li key={i.id}>{i.description}</li>
        ))}
      </ul>
      <p><a href={`/projects/${projectId}/evaluate`}>Proceed to Evaluation</a></p>
    </main>
  );
}