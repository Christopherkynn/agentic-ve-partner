"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface Props {
  currentSlug?: string;
  onNewProject?: (project: Project) => void;
}

export default function ProjectList({ currentSlug, onNewProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async () => {
    if (!newTitle) return;
    try {
      const res = await api.post('/api/projects', { title: newTitle });
      setNewTitle('');
      setProjects([res.data, ...projects]);
      onNewProject?.(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className={`bg-white border-r flex flex-col h-full ${expanded ? 'w-64' : 'w-16'} transition-all`}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold">Projects</span>
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-gray-500">{expanded ? '«' : '»'}</button>
      </div>
      {expanded && (
        <div className="p-3 space-y-4 overflow-auto flex-1">
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 px-2 py-1 border rounded text-sm"
              placeholder="New project"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" onClick={createProject} disabled={!newTitle}>+</button>
          </div>
          <ul className="space-y-1">
            {projects.map(p => (
              <li key={p.id}>
                <Link href={`/projects/${p.slug}`} className={`block px-2 py-1 rounded hover:bg-gray-100 ${p.slug === currentSlug ? 'bg-gray-200 font-medium' : ''}`}>
                  <div className="text-sm truncate">{p.title}</div>
                  <div className="text-xs text-gray-500">{p.status}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}