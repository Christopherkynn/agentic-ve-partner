"use client";
import { useState, FC, ChangeEvent, FormEvent } from 'react';

interface Props {
  onSend: (content: string, files: File[]) => void;
}

const ChatComposer: FC<Props> = ({ onSend }) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    onSend(text.trim(), files);
    setText('');
    setFiles([]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (!f) return;
    setFiles(Array.from(f));
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-3 flex items-center space-x-2">
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="file-input"
      />
      <label htmlFor="file-input" className="px-3 py-1 bg-gray-200 rounded cursor-pointer text-sm">📎</label>
      <textarea
        className="flex-1 resize-none border rounded p-2 text-sm"
        rows={2}
        placeholder="Type your message…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
    </form>
  );
};

export default ChatComposer;