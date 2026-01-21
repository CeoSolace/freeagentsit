// app/page.js
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold text-primary mb-4">FreeAgents Platform</h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl">Connect with elite freelance sports talent. Secure payments, dynamic listings, and vibrant community integration.</p>
      </header>
      <div className="flex flex-col md:flex-row gap-4">
        <Link href="/pricing" className="bg-primary text-white px-8 py-3 rounded-md hover:bg-blue-700 transition font-medium text-lg">
          Pricing
        </Link>
        <Link href="/auth/signin" className="bg-secondary text-white px-8 py-3 rounded-md hover:bg-green-700 transition font-medium text-lg">
          Sign In
        </Link>
      </div>
    </div>
  );
}
