'use client';

import dynamic from 'next/dynamic';

const AdminContent = dynamic(() => import('./AdminContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-500 font-bold uppercase tracking-widest text-xs">Loading Admin HQ...</p>
      </div>
    </div>
  )
});

export default function AdminPage() {
  return <AdminContent />;
}
