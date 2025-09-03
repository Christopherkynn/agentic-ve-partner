"use client";
import { useEffect, useState } from 'react';
// Use useParams from next/navigation instead of next/router. The app router
// provides hooks for accessing dynamic route segments. Using next/router
// inside the app directory can cause runtime errors because it is tied to
// the pages router. See https://nextjs.org/docs/app/api-reference/functions/use-router for details.
import { useParams } from 'next/navigation';
import ProjectList from '@/components/sidebar/ProjectList';
import ChatStream, { ChatMessage } from '@/components/chat/ChatStream';
import ChatComposer from '@/components/chat/ChatComposer';
import RightDrawer from '@/components/drawer/RightDrawer';
import { api } from '@/lib/api';

interface Asset {
  id: string;
  filename: string;
  kind: string;
  created_at: string;
}

export default function ProjectChatPage() {
  // Obtain the dynamic "slug" route parameter using useParams. This hook
  // returns an object mapping route segment names to their values. It is
  // safe to call in a Client Component. When slug is undefined (e.g., during
  // prerender), we avoid fetching data.
  const params = useParams();
  const slug = (params?.slug ?? '') as string;
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<Asset[]>([]);

  // Fetch the project by slug on mount
  useEffect(() => {
    const fetchProject = async () => {
      if (!slug) return;
      try {
        const res = await api.get('/api/projects');
        const proj = res.data.find((p: any) => p.slug === slug);
        if (proj) {
          setProjectId(proj.id);
          setTitle(proj.title);
          // load assets
          const aset = await api.get(`/api/projects/${proj.id}/assets`);
          setFiles(aset.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProject();
  }, [slug]);

  const handleSend = async (content: string, selectedFiles: File[]) => {
    if (!projectId) return;
    // Append user message
    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, newMsg]);
    // Upload any selected files
    if (selectedFiles.length > 0) {
      const form = new FormData();
      form.append('projectId', projectId);
      selectedFiles.forEach(f => form.append('files', f));
      try {
        await api.post('/api/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        const aset = await api.get(`/api/projects/${projectId}/assets`);
        setFiles(aset.data);
      } catch (err) {
        console.error(err);
        alert('File upload failed');
      }
    }
    // Call chat API
    try {
      const body = { projectId, messages: [...messages, newMsg] };
      const res = await api.post('/api/chat', body);
      const { answer, citations } = res.data;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: answer, citations }]);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch response');
    }
  };

  const tabs = [
    {
      key: 'files',
      label: 'Files',
      content: (
        <ul className="space-y-2">
          {files.map(f => (
            <li key={f.id} className="flex justify-between items-center text-xs py-1">
              <span className="truncate flex-1">{f.filename}</span>
              <a href={`/api/assets/${f.id}/download`} className="text-blue-600 hover:underline" download>Download</a>
            </li>
          ))}
        </ul>
      )
    },
    { key: 'fast', label: 'FAST', content: <p className="p-2 text-sm text-gray-500">FAST diagram will appear here once generated.</p> },
    { key: 'ideas', label: 'Ideas', content: <p className="p-2 text-sm text-gray-500">Generated ideas will appear here.</p> },
    { key: 'eval', label: 'Eval Matrix', content: <p className="p-2 text-sm text-gray-500">Evaluation matrix will appear here.</p> },
    { key: 'dev', label: 'Develop', content: <p className="p-2 text-sm text-gray-500">Write‑ups will appear here.</p> },
    { key: 'report', label: 'Report', content: <p className="p-2 text-sm text-gray-500">Draft report will appear here.</p> }
  ];

  return (
    <div className="flex h-full">
      <ProjectList currentSlug={slug as string} />
      <main className="flex-1 flex flex-col">
        <header className="border-b px-4 py-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{title || '…'}</h1>
          </div>
          {/* Quick actions as buttons */}
          <div className="space-x-2 text-sm">
            <button className="px-2 py-1 rounded bg-gray-200">FAST</button>
            <button className="px-2 py-1 rounded bg-gray-200">Ideas</button>
            <button className="px-2 py-1 rounded bg-gray-200">Eval</button>
            <button className="px-2 py-1 rounded bg-gray-200">Develop</button>
            <button className="px-2 py-1 rounded bg-gray-200">Report</button>
          </div>
        </header>
        <ChatStream messages={messages} />
        <ChatComposer onSend={handleSend} />
      </main>
      <RightDrawer tabs={tabs} />
    </div>
  );
}