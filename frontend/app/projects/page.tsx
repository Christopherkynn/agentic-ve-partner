"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async () => {
    if (!newTitle) return;
    try {
      const res = await api.post('/api/projects', { title: newTitle });
      setNewTitle('');
      setProjects([res.data, ...projects]);
    } catch (err) {
      console.error(err);
      alert('Failed to create project');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Your Projects</h1>
      <div className="flex space-x-2 mb-6">
        <input
          type="text"
          className="flex-1 px-3 py-2 border rounded"
          placeholder="New project title"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={createProject}
          disabled={!newTitle}
        >
          New Project
        </button>
      </div>
      {loading ? (
        <p>Loading projects…</p>
      ) : projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map(p => (
            <li key={p.id} className="border rounded p-4 hover:shadow">
              <Link href={`/projects/${p.slug}`} className="font-medium text-blue-700">
                {p.title}
              </Link>
              <div className="text-sm text-gray-500">Status: {p.status}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}