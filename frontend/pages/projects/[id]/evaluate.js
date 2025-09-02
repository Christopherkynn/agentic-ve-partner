import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function EvaluatePage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [ideas, setIdeas] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [newCriterion, setNewCriterion] = useState({ name: '', weight: 1 });

  const fetchData = async () => {
    if (!projectId) return;
    try {
      const ideasRes = await axios.get(`${API_BASE}/ideas/${projectId}`, { withCredentials: true });
      setIdeas(ideasRes.data || []);
      const evalRes = await axios.get(`${API_BASE}/evaluate/${projectId}`, { withCredentials: true });
      setCriteria(evalRes.data.criteria || []);
      // Build initial scores object
      const s = {};
      ideasRes.data.forEach(i => {
        s[i.id] = {};
        (evalRes.data.criteria || []).forEach(c => {
          s[i.id][c.id] = 0;
        });
      });
      setScores(s);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { fetchData(); }, [projectId]);

  const addCriterion = () => {
    if (!newCriterion.name) return;
    setCriteria([...criteria, { id: `new-${Date.now()}`, name: newCriterion.name, weight: parseFloat(newCriterion.weight) }]);
    setNewCriterion({ name: '', weight: 1 });
  };

  const handleScoreChange = (ideaId, criterionId, value) => {
    setScores({ ...scores, [ideaId]: { ...scores[ideaId], [criterionId]: parseFloat(value) } });
  };

  const save = async () => {
    try {
      // Save criteria
      await axios.post(`${API_BASE}/evaluate/${projectId}/criteria`, { criteria: criteria.map(c => ({ name: c.name, weight: c.weight })) }, { withCredentials: true });
      // Flatten scores
      const scoreList = [];
      Object.keys(scores).forEach(ideaId => {
        Object.keys(scores[ideaId]).forEach(criterionId => {
          scoreList.push({ ideaId, criterionId, score: scores[ideaId][criterionId] });
        });
      });
      await axios.post(`${API_BASE}/evaluate/${projectId}/score`, { scores: scoreList }, { withCredentials: true });
      alert('Scores saved');
    } catch (err) {
      console.error(err);
      alert('failed to save scores');
    }
  };

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Evaluation</h1>
      <p>Project ID: {projectId}</p>
      <h2>Criteria</h2>
      <table border="1" cellPadding="4" style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Name</th><th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => (
            <tr key={idx}>
              <td>{c.name}</td>
              <td>{c.weight}</td>
            </tr>
          ))}
          <tr>
            <td><input type="text" value={newCriterion.name} onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })} /></td>
            <td><input type="number" value={newCriterion.weight} onChange={(e) => setNewCriterion({ ...newCriterion, weight: parseFloat(e.target.value) })} /></td>
            <td><button onClick={addCriterion}>Add</button></td>
          </tr>
        </tbody>
      </table>
      <h2>Score Matrix</h2>
      <table border="1" cellPadding="4" style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Idea</th>
            {criteria.map(c => (<th key={c.id}>{c.name}</th>))}
          </tr>
        </thead>
        <tbody>
          {ideas.map(i => (
            <tr key={i.id}>
              <td>{i.description}</td>
              {criteria.map(c => (
                <td key={c.id}>
                  <input
                    type="number"
                    value={scores[i.id]?.[c.id] || 0}
                    onChange={(e) => handleScoreChange(i.id, c.id, e.target.value)}
                    style={{ width: 60 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={save}>Save Scores</button>
      <p><a href={`/projects/${projectId}/develop`}>Proceed to Development</a></p>
    </main>
  );
}