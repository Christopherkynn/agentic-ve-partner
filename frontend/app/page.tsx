import Link from 'next/link';

export default function Home() {
  return (
    <main className="h-full flex items-center justify-center bg-gray-950 text-gray-200">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">FastDiagram VE Workspace</h1>
        <p className="text-gray-400">Select or create a project to get started.</p>
        {/* Wrap the button and a spacer in a flex container to create space for future content */}
        <div className="flex justify-center items-center space-x-8">
          <Link
            href="/projects"
            className="px-6 py-3 rounded-md bg-fuchsia-500 text-white shadow-md hover:bg-fuchsia-400 transition-colors"
          >
            View Projects
          </Link>
          {/* Empty spacer; adjust width to control the amount of blank space indicated by the arrow */}
          <div className="w-24" />
        </div>
      </div>
    </main>
  );
}