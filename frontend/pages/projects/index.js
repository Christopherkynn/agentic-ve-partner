import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`, { withCredentials: true });
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const createProject = async () => {
    if (!name) return alert('Enter a project name');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/projects`, { name }, { withCredentials: true });
      setName('');
      await fetchProjects();
    } catch (err) {
      console.error(err);
      alert('failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Projects</h1>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name"
          style={{ width: '70%', marginRight: '10px' }}
        />
        <button onClick={createProject} disabled={loading}>Create</button>
      </div>
      <ul>
        {projects.map(p => (
          <li key={p.id} style={{ marginBottom: '8px' }}>
            <Link href={`/projects/${p.id}/upload`}><a>{p.name}</a></Link>
          </li>
        ))}
      </ul>
    </main>
  );
}