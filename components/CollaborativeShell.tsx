'use client';
import { motion } from 'framer-motion';

export default function CollaborativeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden font-sans text-slate-300 selection:bg-amber-500/30">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]" style={{ backgroundSize: '40px 40px' }} />
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
