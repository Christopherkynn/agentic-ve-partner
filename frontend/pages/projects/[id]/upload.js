import { useRouter } from 'next/router';
import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function UploadPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    if (!projectId || !file) return alert('Select a file first');
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_BASE}/files/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        }
      });
      const { documentId } = res.data;
      setMessage('Upload successful. Ingesting...');
      // Kick off ingestion via n8n
      await axios.post(`${API_BASE}/n8n/ingest`, { documentId });
      setMessage('File ingested successfully!');
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Upload File</h1>
      <p>Project ID: {projectId}</p>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={!file}>Upload</button>
      {progress > 0 && <p>Progress: {progress}%</p>}
      {message && <p>{message}</p>}
      <p><a href={`/projects/${projectId}/ask`}>Ask about files</a></p>
    </main>
  );
}