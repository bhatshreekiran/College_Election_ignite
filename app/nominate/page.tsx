'use client';

import { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { isFirebaseConfigured, auth, db, googleProvider } from '@/lib/firebase';
import { POSTS_BY_SEMESTER, POSTS_DESCRIPTIONS } from '@/lib/constants';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ALLOWED_DOMAIN = 'sode-edu.in';
const MAX_POSTS = 1;

const getYearFromSemester = (sem: string) => sem === '6th' ? '3rd Year' : '2nd Year';

function compressImage(file: File, maxDim = 800, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        try {
          const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) { reject(e); }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type Step = 'login' | 1 | 2 | 3;

export default function NominatePage() {
  const [step, setStep]         = useState<Step>('login');

  // Auth User
  const [userEmail, setUserEmail]   = useState('');
  const [userName, setUserName]     = useState('');
  const [userPhoto, setUserPhoto]   = useState('');
  const [existingNomination, setExistingNomination] = useState<any>(null);

  // Step 1: Eligibility
  const [semester, setSemester]     = useState('');
  const [hasNoBacklog, setHasNoBacklog] = useState(false);

  // Step 2: Posts & Reasons
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [statements, setStatements]       = useState<Record<string, string>>({});

  // Step 3: Face Photo
  const [photoFile, setPhotoFile]     = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        const email = user.email?.toLowerCase() ?? '';
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          signOut(auth);
          setError(`Join with @${ALLOWED_DOMAIN} only.`);
          return;
        }

        // Academic verification per user instructions:
        const special6thSem = [
          'amithraj.24ad400@sode-edu.in',
          'ranganath.24ad401@sode-edu.in',
          'vighnesha24ad403@sode-edu.in',
          'thanmay.24ad402@sode-edu.in'
        ];
        
        const special4thSem = [
          'chandeesh.24ad062@sode-edu.in',
          'sampath.25dsdip01@sode-edu.in',
          'srajan.23ad050@sode-edu.in'
        ];

        let detectedSemester = '';
        if (special6thSem.includes(email)) {
          detectedSemester = '6th';
        } else if (special4thSem.includes(email)) {
          detectedSemester = '4th';
        } else {
          if (email.includes('23ad')) detectedSemester = '6th';
          else if (email.includes('34ad') || email.includes('24ad')) detectedSemester = '4th';
        }

        if (!detectedSemester) {
          signOut(auth);
          setError('Only 4th and 6th semester students are eligible.');
          return;
        }
        
        setUserEmail(email);
        setUserName(user.displayName ?? '');
        setUserPhoto(user.photoURL ?? '');
        setSemester(detectedSemester);
        setError('');

        if (db) {
          setLoading(true);
          try {
            const snap = await getDoc(doc(db, 'nominations', email));
            if (snap.exists()) {
              setExistingNomination(snap.data());
              setSubmitted(true);
            } else {
              setStep(1);
            }
          } catch (err) { console.error(err); }
          finally { setLoading(false); }
        }
      } else {
        setStep('login');
      }
    });
    return unsub;
  }, []);

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      setError('System Error: Firebase is not configured. Please add your Firebase Web API keys to .env.local!');
      return;
    }
    setLoginLoading(true);
    try { 
      await signInWithPopup(auth, googleProvider); 
    }
    catch (err: any) { 
        console.error("Login Error:", err);
        setError(`Login failed: ${err.message}`); 
    }
    finally { setLoginLoading(false); }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      setSubmitted(false);
      setExistingNomination(null);
      setUserEmail('');
      setStep('login');
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const togglePost = (post: string) => {
    setSelectedPosts(prev => {
      if (prev.includes(post)) {
        const nextStmts = { ...statements };
        delete nextStmts[post];
        setStatements(nextStmts);
        return [];
      }
      if (prev.length >= MAX_POSTS) return prev; // Enforces blocking other selections
      setStatements({}); // clear any previous statement as only 1 is allowed
      return [post];
    });
  };

  const isPostDisabled = (p: string) => !selectedPosts.includes(p) && selectedPosts.length >= MAX_POSTS;

  const handleStatementChange = (post: string, text: string) => {
    setStatements(prev => ({ ...prev, [post]: text.slice(0, 800) }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasNoBacklog) setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPosts.length === 0) { setError('Select at least one post.'); return; }
    // Check if all selected posts have statements
    const allHaveReasons = selectedPosts.every(p => statements[p]?.trim().length > 10);
    if (!allHaveReasons) { setError('Please write why you want each selected post (min 10 chars).'); return; }
    setError('');
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !db) return;
    setLoading(true);
    setLoadingMsg('Submitting Final Nomination...');
    try {
      const photoBase64 = await compressImage(photoFile, 800, 0.78);
      await setDoc(doc(db, 'nominations', userEmail), {
        name: userName,
        email: userEmail,
        semester,
        year: getYearFromSemester(semester),
        posts: selectedPosts,
        photo_base64: photoBase64,
        post_statements: statements, // Map of postName -> whyThisPost
        status: 'pending',
        submittedAt: new Date(),
      });
      // Do not sign out immediately so they can see the withdraw screen!
      setSubmitted(true);
    } catch (err) { setError('Submission failed.'); }
    finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!db || !userEmail || !window.confirm("Are you sure you want to withdraw your nomination? You can nominate again afterwards.")) return;
    setWithdrawing(true);
    try {
      await deleteDoc(doc(db, 'nominations', userEmail));
      setExistingNomination(null);
      setSubmitted(false);
      setStep(1);
      setSelectedPosts([]);
      setStatements({});
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (err) {
      console.error(err);
      alert('Could not withdraw your nomination. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  // ── Views ──────────────────────────────────────────────────────────────────
  if (submitted || existingNomination) {
    const data = existingNomination || { name: userName, email: userEmail, semester, posts: selectedPosts, year: getYearFromSemester(semester) };
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full space-y-6">
           <div className="text-6xl">🙌</div>
           <h2 className="text-2xl font-black text-white uppercase tracking-tight">Application Submitted</h2>
           <p className="text-slate-400 text-sm leading-relaxed">Your nomination has been successfully recorded. You can view your status here or withdraw if needed.</p>
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl text-left text-xs space-y-3">
              <p><span className="text-white opacity-50 font-bold">NAME:</span> <span className="text-white">{data.name}</span></p>
              <p><span className="text-white opacity-50 font-bold">POST:</span> <span className="text-amber-500 font-bold">{data.posts?.join(', ')}</span></p>
              <p><span className="text-white opacity-50 font-bold">ACADEMIC:</span> <span className="text-white">{data.semester} Sem, {data.year || getYearFromSemester(data.semester)}</span></p>
           </div>
           
           <div className="pt-2 flex flex-col gap-4">
              <button onClick={handleSignOut} className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Sign Out</button>
              <button 
                onClick={handleWithdraw} 
                disabled={withdrawing} 
                className="w-full py-4 bg-red-900/10 text-red-500 font-black rounded-2xl uppercase tracking-[0.2em] border border-red-500/20 hover:bg-red-900/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {withdrawing ? 'Removing...' : 'Withdraw Nomination'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-serif bg-[linear-gradient(to_bottom_right,#0f172a,#1e3a8a,#0f172a)] py-12 px-4 shadow-inner">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center group">
           <h1 className="text-5xl font-black text-white uppercase tracking-tighter group-hover:scale-105 transition-transform duration-500 drop-shadow-lg">Student Council Elections</h1>
           <p className="text-amber-400 mt-2 text-sm font-black tracking-[0.4em] uppercase drop-shadow-md">Official Election Portal - 2026</p>
        </div>

        {step === 'login' ? (
          <div className="bg-slate-800/80 border border-slate-700 p-12 rounded-[3rem] shadow-2xl text-center space-y-8 max-w-lg mx-auto backdrop-blur-md">
             <div className="text-5xl">🎓</div>
             <h2 className="text-2xl font-black text-white uppercase tracking-tight">Student Sign-In</h2>
             <p className="text-slate-400 text-sm leading-relaxed">Sign in with your official <span className="text-white font-bold">@{ALLOWED_DOMAIN}</span> to continue.</p>
             {error && <p className="text-red-400 text-[10px] font-black uppercase bg-red-950/40 p-3 rounded-xl border border-red-500/20 tracking-widest">{error}</p>}
             <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full py-4 bg-white text-slate-800 font-bold rounded-full text-base flex items-center justify-center gap-4 hover:bg-slate-100 transition-all shadow-lg active:scale-[0.98] border border-slate-200">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                 <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
                 <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                 <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                 <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
               </svg>
               {loginLoading ? 'Signing in...' : 'Sign in with Google'}
             </button>

             <div className="pt-4 border-t border-slate-700/50">
                <button onClick={() => window.location.href = '/admin'} className="w-full py-3 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-amber-500 font-bold rounded-full text-xs transition-all border border-slate-700 uppercase tracking-widest">
                  Staff / Admin Login
                </button>
             </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/60 rounded-[2rem] px-6 py-4 backdrop-blur-sm shadow-xl">
               <div className="flex items-center gap-4">
                  <img src={userPhoto} className="w-12 h-12 rounded-2xl border-2 border-amber-500/20 shadow-lg" alt="Profile" />
                  <div>
                    <p className="text-white text-xs font-black uppercase tracking-tight">{userName}</p>
                    <p className="text-slate-500 text-[10px] font-bold">{userEmail}</p>
                  </div>
               </div>
               <button onClick={handleSignOut} className="px-4 py-2 bg-slate-700/50 hover:bg-red-900/30 text-white/40 hover:text-red-400 text-[9px] font-black uppercase rounded-xl transition-all tracking-widest border border-slate-700">Sign Out</button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-[3rem] shadow-2xl p-8 sm:p-12 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-700">
                  <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${(Number(step)/3)*100}%` }} />
               </div>

               {error && <div className="mb-8 p-4 bg-red-900/20 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-xs font-bold leading-tight animate-in slide-in-from-top-4"><span>🚫</span> {error}</div>}

               {/* ── STEP 1: ELIGIBILITY ──────────────────────────────────────── */}
               {step === 1 && (
                 <form onSubmit={handleStep1} className="space-y-12">
                   <div className="text-center space-y-2">
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Eligibility Check</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Step 1 / Verify Your Requirements</p>
                   </div>
                   
                   <div className="flex justify-center mb-6">
                      <div className="p-8 rounded-[2.5rem] border-2 border-amber-500 bg-amber-500/10 ring-4 ring-amber-500/10 shadow-2xl flex flex-col items-center gap-4 w-64">
                         <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-3xl font-black transition-all bg-amber-500 text-slate-900 rotate-3">{semester[0]}</div>
                         <p className="font-black uppercase tracking-[0.2em] text-xs text-amber-500">YOUR SEMESTER: {semester}</p>
                         <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center bg-amber-500 border-amber-500 text-slate-900 scale-110"><span className="text-[10px] font-black">✓</span></div>
                      </div>
                   </div>

                   <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <label className="flex items-center gap-5 cursor-pointer select-none">
                         <div className="relative flex items-center">
                            <input type="checkbox" checked={hasNoBacklog} onChange={e => setHasNoBacklog(e.target.checked)} className="w-8 h-8 rounded-xl bg-slate-800 border-2 border-slate-600 checked:bg-amber-500 checked:border-amber-500 transition-all appearance-none cursor-pointer shadow-inner" />
                            {hasNoBacklog && <span className="absolute left-2.5 top-2.5 text-slate-900 text-sm font-black pointer-events-none">✓</span>}
                         </div>
                         <div className="space-y-1">
                            <p className={`font-black uppercase tracking-widest text-xs transition-all ${hasNoBacklog ? 'text-amber-500' : 'text-slate-400'}`}>I have cleared all backlogs</p>
                            <p className="text-[10px] text-slate-600 font-bold leading-relaxed">Candidates with active backlogs are strictly not allowed to contest as per college policy.</p>
                         </div>
                      </label>
                   </div>

                   <button type="submit" disabled={!semester || !hasNoBacklog} className="w-full py-5 bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-black rounded-[2rem] uppercase tracking-[0.3em] text-sm transition-all shadow-2xl shadow-amber-500/20 active:scale-95">Verify & Proceeed →</button>
                 </form>
               )}

               {/* ── STEP 2: POSTS & REASONS ─────────────────────────────────── */}
               {step === 2 && (
                 <form onSubmit={handleStep2} className="space-y-10">
                   <div className="flex flex-col items-center space-y-2">
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Select Your Position</h2>
                      <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Choose one role and state your reason</p>
                   </div>

                   <div className="space-y-6">
                     {POSTS_BY_SEMESTER[semester]?.map(p => {
                       const sel = selectedPosts.includes(p);
                       const dis = isPostDisabled(p);
                       return (
                         <div key={p} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${sel ? 'bg-slate-700/40 border-amber-500 shadow-2xl' : dis ? 'opacity-20 grayscale pointer-events-none' : 'bg-slate-700/10 border-slate-700 hover:border-slate-500 hover:bg-slate-700/20'}`}>
                            <div className="flex items-center justify-between mb-6">
                               <div className="flex flex-col">
                                  <h3 className={`text-lg font-black uppercase tracking-tight ${sel ? 'text-amber-400' : 'text-white'}`}>{p}</h3>
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Level 0{semester[0]} Position</p>
                               </div>
                               <button type="button" onClick={() => togglePost(p)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sel ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'}`}>
                                  {sel ? 'Deselect' : 'Select Post'}
                               </button>
                            </div>
                            
                            <ul className="mb-8 space-y-2">
                               {POSTS_DESCRIPTIONS[p]?.description.map((pt, i) => <li key={i} className="text-[11px] text-slate-400 flex items-start gap-3 leading-relaxed font-bold"><span className="text-amber-500">•</span> {pt}</li>)}
                            </ul>

                            {sel && (
                              <div className="mt-8 space-y-3 pt-6 border-t border-slate-700/50 animate-in fade-in zoom-in-95 duration-500">
                                 <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">Why do you want this post? *</label>
                                 <textarea 
                                    value={statements[p] || ''} 
                                    onChange={e => handleStatementChange(p, e.target.value)} 
                                    required
                                    placeholder="Briefly explain your vision and goals for this specific role..."
                                    className="w-full h-32 bg-slate-900/60 border-2 border-slate-700 rounded-2xl p-4 text-white text-xs font-medium leading-relaxed resize-none outline-none focus:border-amber-500 transition-all placeholder:text-slate-700"
                                 />
                                 <div className="flex justify-between items-center text-[9px] font-black">
                                    <span className="text-slate-600 tracking-tighter uppercase">Min 10 characters required</span>
                                    <span className={(statements[p]?.length || 0) >= 800 ? 'text-red-500' : 'text-slate-500'}>{(statements[p]?.length || 0)} / 800</span>
                                 </div>
                              </div>
                            )}
                         </div>
                       );
                     })}
                   </div>

                   <div className="flex gap-4 pt-10">
                      <button type="button" onClick={() => setStep(1)} className="px-8 py-5 bg-slate-700/50 text-white/50 hover:text-white font-black rounded-[2rem] uppercase tracking-widest text-xs transition-all border border-slate-700">Back</button>
                      <button type="submit" className="flex-1 py-5 bg-amber-500 text-slate-900 font-black rounded-[2rem] uppercase tracking-[0.3em] text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all">Review Final Steps →</button>
                   </div>
                 </form>
               )}

               {/* ── STEP 3: FACE VERIFICATION ───────────────────────────────── */}
               {step === 3 && (
                 <form onSubmit={handleSubmit} className="space-y-12">
                   <div className="text-center space-y-2">
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Final Submission</h2>
                      <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Please upload a clear photo of yourself</p>
                   </div>

                   <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-slate-700/60 flex flex-col items-center space-y-8">
                      <div className="relative group">
                         {photoPreview ? (
                            <img src={photoPreview} className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-amber-500 shadow-2xl transition-transform group-hover:scale-105 duration-500" alt="Preview" />
                         ) : (
                            <div className="w-40 h-40 bg-slate-800 rounded-[2.5rem] border-4 border-dashed border-slate-700 flex flex-col items-center justify-center text-4xl grayscale opacity-40">📸</div>
                         )}
                         <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 active:scale-90 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg>
                            <input type="file" onChange={handlePhotoSelect} className="hidden" accept="image/*" />
                         </label>
                      </div>
                      <div className="text-center space-y-2">
                         <p className="text-white text-sm font-black uppercase tracking-tight">Upload Your Face Photo</p>
                         <p className="text-slate-500 text-[10px] font-bold">Square aspect ratio (1:1) recommended for best results.</p>
                      </div>
                   </div>

                   {loading && (
                      <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-[2rem] p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
                         <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                         <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em]">{loadingMsg}</span>
                      </div>
                   )}

                   <div className="flex gap-4">
                      <button type="button" onClick={() => setStep(2)} disabled={loading} className="px-8 py-5 bg-slate-700/50 text-white/50 hover:text-white font-black rounded-[2rem] uppercase tracking-widest text-xs transition-all border border-slate-700 disabled:opacity-30">Back</button>
                      <button type="submit" disabled={loading || !photoFile} className="flex-1 py-5 bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-black rounded-[2rem] uppercase tracking-[0.3em] text-sm shadow-2xl shadow-amber-500/20 active:scale-95 transition-all">Submit Final Bid 🚀</button>
                   </div>
                 </form>
               )}

            </div>
          </div>
        )}
        
        {/* Hidden Admin Link */}
        <div className="text-center pt-8">
           <a href="/admin" className="text-[9px] font-black uppercase tracking-widest text-slate-500/30 hover:text-amber-500 transition-colors">Admin Portal Access</a>
        </div>
      </div>
    </div>
  );
}
