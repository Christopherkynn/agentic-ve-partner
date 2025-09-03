import Link from 'next/link';

export default function Home() {
  return (
    <main className="h-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">FastDiagram VE Workspace</h1>
        <p className="text-gray-600">Select or create a project to get started.</p>
        <Link href="/projects" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">View Projects</Link>
      </div>
    </main>
  );
}