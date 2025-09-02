import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function DevelopPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [ideas, setIdeas] = useState([]);
  const [writeups, setWriteups] = useState({});

  const fetchIdeas = async () => {
    if (!projectId) return;
    try {
      const res = await axios.get(`${API_BASE}/ideas/${projectId}`, { withCredentials: true });
      setIdeas(res.data || []);
      const w = {};
      (res.data || []).forEach(i => {
        w[i.id] = { writeup: '', costDelta: '', scheduleDelta: '', risks: '', benefits: '' };
      });
      setWriteups(w);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { fetchIdeas(); }, [projectId]);

  const handleChange = (ideaId, field, value) => {
    setWriteups({ ...writeups, [ideaId]: { ...writeups[ideaId], [field]: value } });
  };

  const save = async () => {
    try {
      const payload = Object.keys(writeups).map(ideaId => ({ ideaId, ...writeups[ideaId] }));
      await axios.post(`${API_BASE}/develop/${projectId}`, { writeups: payload }, { withCredentials: true });
      alert('Write-ups saved');
    } catch (err) {
      console.error(err);
      alert('failed to save write-ups');
    }
  };

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Development</h1>
      <p>Project ID: {projectId}</p>
      {ideas.map(i => (
        <div key={i.id} style={{ marginBottom: 30, borderBottom: '1px solid #ccc', paddingBottom: 20 }}>
          <h3>{i.description}</h3>
          <textarea
            rows={4}
            placeholder="Write-up"
            style={{ width: '100%' }}
            value={writeups[i.id]?.writeup || ''}
            onChange={(e) => handleChange(i.id, 'writeup', e.target.value)}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: 10 }}>
            <input
              type="text"
              placeholder="Cost Delta"
              value={writeups[i.id]?.costDelta || ''}
              onChange={(e) => handleChange(i.id, 'costDelta', e.target.value)}
            />
            <input
              type="text"
              placeholder="Schedule Delta"
              value={writeups[i.id]?.scheduleDelta || ''}
              onChange={(e) => handleChange(i.id, 'scheduleDelta', e.target.value)}
            />
            <input
              type="text"
              placeholder="Risks"
              value={writeups[i.id]?.risks || ''}
              onChange={(e) => handleChange(i.id, 'risks', e.target.value)}
            />
            <input
              type="text"
              placeholder="Benefits"
              value={writeups[i.id]?.benefits || ''}
              onChange={(e) => handleChange(i.id, 'benefits', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button onClick={save}>Save Write-ups</button>
      <p><a href={`/projects/${projectId}/report`}>Generate Report</a></p>
    </main>
  );
}