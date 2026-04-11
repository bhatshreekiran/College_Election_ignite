'use client';

import { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { POSTS_BY_SEMESTER } from '@/lib/constants';

const ALLOWED_DOMAIN = 'sode-edu.in';

export default function VotePage() {
  const [step, setStep] = useState<'login' | 'vote' | 'done'>('login');
  
  // Auth User
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const [semester, setSemester] = useState('');

  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  const [candidates, setCandidates] = useState<any[]>([]);
  // votes: record of post name to candidate email
  const [votes, setVotes] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);

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
            // Check if user already voted
            const voteSnap = await getDoc(doc(db, 'votes', email));
            if (voteSnap.exists()) {
              setStep('done');
            } else {
              // Fetch candidates
              const snap = await getDocs(collection(db, 'nominations'));
              const acc = snap.docs.map(d => d.data()).filter(c => c.status === 'accepted');
              setCandidates(acc);
              setStep('vote');
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
    if (!auth || !googleProvider) return;
    setLoginLoading(true);
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (err: any) { 
      setError(`Login failed: ${err.message}`); 
    } finally { setLoginLoading(false); }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      setUserEmail('');
      setStep('login');
      setVotes({});
    }
  };

  const submitVotes = async () => {
    if (!db || !userEmail || Object.keys(votes).length === 0) {
      setError('Please cast at least one vote before submitting.');
      return;
    }
    
    if (!window.confirm("Are you sure? Once submitted, your vote cannot be altered.")) return;
    
    setSubmitting(true);
    try {
      await setDoc(doc(db, 'votes', userEmail), {
        email: userEmail,
        name: userName,
        semester,
        votes: votes,
        timestamp: new Date()
      });
      setStep('done');
    } catch (err) { setError('Submission failed. Try again.'); }
    finally { setSubmitting(false); }
  };

  const toggleVote = (post: string, candidateEmail: string) => {
    setVotes(prev => {
      const next = { ...prev };
      if (next[post] === candidateEmail) {
        delete next[post]; // Deselect
      } else {
        next[post] = candidateEmail; // Select
      }
      return next;
    });
  };

  // Group candidates by semester and post where counts > 1
  const renderVotingSection = (sem: string) => {
    if (!POSTS_BY_SEMESTER[sem]) return null;

    const applicablePosts = POSTS_BY_SEMESTER[sem].map(post => {
      const cans = candidates.filter(c => c.semester === sem && c.posts?.includes(post));
      return { post, cans };
    }).filter(info => info.cans.length > 1);

    if (applicablePosts.length === 0) return null;

    return (
      <div key={sem} className="space-y-10 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-black text-lg">{sem[0]}</div>
          <h2 className="text-2xl font-bold text-white">{sem} Semester Voting</h2>
        </div>
        
        <div className="space-y-12">
          {applicablePosts.map(({ post, cans }) => (
            <div key={post} className="bg-slate-800/60 border border-slate-700/60 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md">
              <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest text-center mb-8 border-b border-amber-500/20 pb-4">{post}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {cans.map(can => {
                  const isSelected = votes[post] === can.email;
                  const statement = can.post_statements?.[post] || can.statement || "No specific statement provided.";
                  
                  return (
                    <div 
                      key={can.email} 
                      onClick={() => toggleVote(post, can.email)}
                      className={`relative p-6 md:p-8 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row items-center sm:items-stretch gap-8 group ${
                        isSelected 
                          ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/20 scale-[1.02]' 
                          : 'bg-slate-900/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-500'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-8 h-8 z-20 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 shadow-lg scale-in">
                          <span className="text-sm font-black">✓</span>
                        </div>
                      )}
                      
                      <div className="w-40 h-40 md:w-56 md:h-56 flex-shrink-0 relative">
                        <img 
                          src={can.photo_base64} 
                          alt={can.name} 
                          className={`w-full h-full rounded-[1.5rem] object-cover shadow-2xl border-4 transition-all ${
                            isSelected ? 'border-amber-500 shadow-amber-500/20' : 'border-slate-700 group-hover:border-slate-500'
                          }`}
                        />
                      </div>
                      
                      <div className="flex flex-col flex-1 h-full w-full">
                        <h4 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mb-4 text-center sm:text-left">{can.name}</h4>
                        
                        <div className="flex-1 bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 mb-6 text-left shadow-inner">
                          <p className="text-sm md:text-base text-slate-300 font-medium italic leading-relaxed whitespace-pre-wrap">"{statement}"</p>
                        </div>
                        
                        <button 
                          className={`w-full py-4 mt-auto rounded-[1rem] text-sm font-black uppercase tracking-widest transition-all shadow-md ${
                            isSelected 
                              ? 'bg-amber-500 text-slate-900 shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' 
                              : 'bg-slate-700/50 text-slate-300 group-hover:bg-slate-700 group-hover:text-white border border-slate-600'
                          }`}
                        >
                          {isSelected ? '✔ Voted' : 'Cast Vote'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#0f172a,#1e3a8a,#0f172a)] flex items-center justify-center p-6 font-serif">
        <div className="bg-slate-800/80 border border-slate-700 p-12 rounded-[3rem] shadow-2xl text-center max-w-md w-full space-y-8 backdrop-blur-md">
           <div className="text-6xl animate-bounce">🎉</div>
           <h2 className="text-3xl font-bold text-white">Voting Complete!</h2>
           <p className="text-slate-400 text-sm leading-relaxed">Your vote has been successfully cast. Thank you for participating in the Ignite Club Elections!</p>
           <button onClick={handleSignOut} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-serif bg-[linear-gradient(to_bottom_right,#0f172a,#1e3a8a,#0f172a)] py-12 px-4">
      <div className="max-w-[95rem] mx-auto space-y-10">
        <div className="text-center group pt-4">
           <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-xl group-hover:scale-105 transition-transform duration-500 pb-2">Ignite Club Elections</h1>
           <p className="text-slate-300 mt-3 text-sm font-medium tracking-[0.2em] uppercase">Official Voting Portal</p>
        </div>

        {step === 'login' ? (
          <div className="bg-slate-800/80 border border-slate-700 p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 max-w-lg mx-auto backdrop-blur-xl mt-12 animate-in fade-in zoom-in-95 duration-500">
             <div className="text-6xl drop-shadow-2xl">🗳️</div>
             <h2 className="text-2xl font-bold text-white">Student Sign In</h2>
             <p className="text-slate-400 text-sm leading-relaxed">Use your official college email (<span className="text-amber-400 font-semibold">@{ALLOWED_DOMAIN}</span>) to cast your vote.</p>
             {error && <p className="text-red-400 text-xs font-bold bg-red-950/40 p-4 rounded-xl border border-red-500/20">{error}</p>}
             
             <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full py-5 bg-white text-slate-800 font-black rounded-full text-sm flex items-center justify-center gap-4 hover:bg-slate-100 transition-all shadow-xl hover:shadow-white/20 active:scale-[0.98] border border-slate-200">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                 <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
                 <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                 <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                 <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
               </svg>
               {loginLoading ? 'Signing in...' : 'Sign in with Google'}
             </button>
             
             <div className="pt-4 border-t border-slate-700/50">
               <button onClick={() => window.location.href = '/admin'} className="w-full py-4 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-amber-500 font-bold rounded-full text-xs transition-all border border-slate-700 uppercase tracking-widest">
                 Faculty / Admin Portal
               </button>
             </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/60 rounded-[2.5rem] px-8 py-5 backdrop-blur-xl shadow-2xl">
               <div className="flex items-center gap-5">
                 {userPhoto ? (
                   <img src={userPhoto} className="w-14 h-14 rounded-full border-2 border-amber-500 shadow-lg object-cover" alt="Profile" />
                 ) : (
                   <div className="w-14 h-14 rounded-full border-2 border-slate-600 bg-slate-800 flex items-center justify-center text-xl">👤</div>
                 )}
                 <div>
                   <p className="text-white text-sm font-black uppercase tracking-wider">{userName || 'Student User'}</p>
                   <p className="text-slate-400 text-xs font-medium">{userEmail}</p>
                 </div>
              </div>
              <button onClick={handleSignOut} className="px-5 py-2.5 bg-slate-700/50 hover:bg-red-900/80 text-slate-300 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-slate-600 shadow-lg">Sign Out</button>
            </div>

            {loading ? (
               <div className="py-20 flex flex-col items-center justify-center space-y-6">
                 <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-amber-500/20" />
                 <p className="text-amber-500 text-sm font-black tracking-[0.3em] uppercase animate-pulse">Loading Candidates...</p>
               </div>
            ) : (
               <div className="space-y-16">
                 {error && <div className="mb-8 p-5 bg-red-900/40 border-2 border-red-500/40 rounded-2xl flex items-center gap-4 text-red-200 text-sm font-bold shadow-xl"><span>🚫</span> {error}</div>}

                 {/* Render Voting Sections */}
                 {['6th', '4th'].map(sem => renderVotingSection(sem))}

                 {/* Submit Section */}
                 <div className="pt-10 border-t-2 border-slate-700/50 text-center flex flex-col items-center gap-6">
                   <p className="text-slate-400 text-sm font-semibold italic max-w-md">Please review your selections above. Once submitted, your vote is final and cannot be modified.</p>
                   {Object.keys(votes).length > 0 && (
                     <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl">
                       <p className="text-amber-500 text-xs font-black uppercase tracking-widest">{Object.keys(votes).length} Vote(s) Selected</p>
                     </div>
                   )}
                   <button 
                     onClick={submitVotes}
                     disabled={submitting || Object.keys(votes).length === 0}
                     className="w-full md:w-auto px-16 py-6 bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none text-slate-900 font-black rounded-full text-lg uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all hover:scale-105"
                   >
                     {submitting ? 'Submitting...' : 'Submit Final Votes'}
                   </button>
                 </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
