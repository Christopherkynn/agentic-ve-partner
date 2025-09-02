import { useRouter } from 'next/router';
import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function ReportPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [docxUrl, setDocxUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/report/${projectId}/export`, { withCredentials: true });
      const { docxToken, pdfToken } = res.data;
      setDocxUrl(`${API_BASE}/report/download?token=${encodeURIComponent(docxToken)}`);
      setPdfUrl(`${API_BASE}/report/download?token=${encodeURIComponent(pdfToken)}`);
    } catch (err) {
      console.error(err);
      alert('failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Report</h1>
      <p>Project ID: {projectId}</p>
      <button onClick={generate} disabled={loading}>Generate Report</button>
      {docxUrl && (
        <div style={{ marginTop: 20 }}>
          <a href={docxUrl} target="_blank" rel="noopener noreferrer">Download DOCX</a>
          <br />
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Download PDF</a>
        </div>
      )}
    </main>
  );
}