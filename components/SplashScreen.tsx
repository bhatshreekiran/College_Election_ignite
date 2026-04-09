'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="relative"
            >
              <img src="/logo.jpg" alt="Club Logo" className="w-56 h-56 object-contain rounded-full shadow-[0_0_80px_rgba(245,158,11,0.2)] bg-slate-900 border-4 border-slate-800" />
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-6 border-2 border-transparent rounded-full border-t-amber-500 border-b-cyan-500 opacity-50"
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-10 flex flex-col items-center"
            >
              <div className="flex items-center gap-2 text-amber-500 font-black tracking-[0.4em] uppercase text-sm">
                Initiating Session
                <motion.span 
                  animate={{ opacity: [0, 1, 0] }} 
                  transition={{ duration: 1.5, repeat: Infinity }}
                >...</motion.span>
              </div>
              <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest font-bold">Establishing Secure Node</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!loading && children}
    </>
  );
}
