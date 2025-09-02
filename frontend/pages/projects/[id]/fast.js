import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import CytoscapeComponent from 'react-cytoscapejs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function FastPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [elements, setElements] = useState([]);
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGraph = async () => {
    if (!projectId) return;
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        axios.get(`${API_BASE}/fast/${projectId}/nodes`, { withCredentials: true }),
        axios.get(`${API_BASE}/fast/${projectId}/edges`, { withCredentials: true })
      ]);
      const nodes = nodesRes.data.map(n => ({ data: { id: n.id, label: n.label } }));
      const edges = edgesRes.data.map(e => ({ data: { id: e.id, source: e.source, target: e.target, label: e.label } }));
      setElements([...nodes, ...edges]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchGraph(); }, [projectId]);

  const generate = async () => {
    if (!objective) return alert('Enter an objective');
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/fast/${projectId}/generate`, { objective }, { withCredentials: true });
      setObjective('');
      await fetchGraph();
    } catch (err) {
      console.error(err);
      alert('failed to generate FAST');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Function Analysis (FAST)</h1>
      <p>Project ID: {projectId}</p>
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Enter objective for FAST generation"
          style={{ width: '70%', marginRight: '10px' }}
        />
        <button onClick={generate} disabled={loading}>Generate FAST</button>
      </div>
      <div style={{ border: '1px solid #ccc', height: '500px' }}>
        <CytoscapeComponent elements={elements} style={{ width: '100%', height: '100%' }} layout={{ name: 'breadthfirst' }} />
      </div>
    </main>
  );
}