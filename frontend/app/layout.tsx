import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'FastDiagram VE Workspace',
  description: 'Chat‑centric value engineering workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen bg-gray-100 text-gray-900">
        {children}
      </body>
    </html>
  );
}