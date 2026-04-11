'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { isFirebaseConfigured, auth, db } from '@/lib/firebase';
import { POSTS_BY_SEMESTER, ALL_POSTS, formatPostName } from '@/lib/constants';

interface Nomination {
  id: string;
  name: string;
  email: string;
  semester: string;
  year?: string;
  posts: string[];
  photo_base64: string;
  post_statements?: Record<string, string>;
  statement?: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: any;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [adminEmail, setAdminEmail]   = useState('');
  const [password, setPassword]       = useState('');
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();

  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [votesData, setVotesData] = useState<any[]>([]);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterPost, setFilterPost]         = useState('all');
  const [viewMode, setViewMode]             = useState<'table' | 'posts' | 'votes'>('posts');
  const [searchVoterQuery, setSearchVoterQuery] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState('');
  const [viewReasons, setViewReasons]   = useState<{name: string, data: Record<string, string>} | null>(null);

  useEffect(() => {
    if (!auth) return;
    // Force logout from any previous sessions when entering admin portal
    signOut(auth).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !db) return;
    const unsubNoms = onSnapshot(collection(db, 'nominations'), snapshot => {
      const noms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Nomination));
      noms.sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));
      setNominations(noms);
    });
    const unsubVotes = onSnapshot(collection(db, 'votes'), snapshot => {
      setVotesData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubNoms(); unsubVotes(); };
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true); setLoginError('');
    try {
      let activePassword = 'vote@123';
      try {
        const snap = await getDoc(doc(db, 'config', 'adminAuth'));
        if (snap.exists() && snap.data().password) {
          activePassword = snap.data().password;
        } else {
          const local = localStorage.getItem('adminPassword');
          if (local) activePassword = local;
        }
      } catch (err) {
        const local = localStorage.getItem('adminPassword');
        if (local) activePassword = local;
      }

      if (adminEmail.toLowerCase() === 'vote@sode-edu.in' && password === activePassword) {
        if (auth) {
          await signInWithEmailAndPassword(auth, adminEmail, password).catch(() => {});
        }
        setIsLoggedIn(true);
      } else {
        setLoginError('Invalid credentials.');
      }
    } catch (e) {
      setLoginError('Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (resetEmail.toLowerCase() !== 'vote@sode-edu.in') {
      setResetError('Incorrect administrator email.');
      return;
    }
    if (resetPin !== '998877') { // Secret PIN
      setResetError('Invalid Security PIN.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    try {
      try {
        await setDoc(doc(db, 'config', 'adminAuth'), { password: newPassword }, { merge: true });
      } catch (err) {
        // Fallback to local storage if firestore rules block unauthenticated writes
      }
      localStorage.setItem('adminPassword', newPassword);
      setResetSuccess('Password updated successfully! Switching to login...');
      setTimeout(() => {
        setResetMode(false);
        setResetSuccess('');
        setResetEmail('');
        setResetPin('');
        setNewPassword('');
      }, 2000);
    } catch (err) {
      setResetError('Failed to update password.');
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth).catch(() => {});
    setIsLoggedIn(false);
  };

  const updateStatus = async (nomId: string, status: 'accepted' | 'rejected' | 'pending') => {
    if (!db) return;
    try { await updateDoc(doc(db, 'nominations', nomId), { status }); }
    catch (err) { console.error(err); }
  };

  // ── IMPORTANT: Dynamic imports for PDF to prevent SSR build issues ─────────
  const generateAcceptedPDF = async () => {
    const acceptedNoms = nominations.filter(n => n.status === 'accepted');
    if (acceptedNoms.length === 0) {
      alert('No accepted candidates found to export.');
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Accepted Candidates - Election 2026', 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

      const tableData = acceptedNoms.map(nom => [
        nom.name,
        `${nom.semester} Sem${nom.year ? ` - ${nom.year}` : ''}`,
        nom.posts.join('\n'),
        nom.post_statements 
          ? Object.entries(nom.post_statements).map(([p, r]) => `${p}: ${r}`).join('\n\n')
          : (nom.statement || '-')
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Candidate Name', 'Semester', 'Applied Posts', 'Vision Statements']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [245, 158, 11] }, // Amber 500
        columnStyles: {
          3: { cellWidth: 80 }
        }
      });

      doc.save(`Accepted_Candidates_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please try again.');
    }
  };

  const generateResultsWord = async () => {
    if (votesData.length === 0) {
      alert('No votes data available.');
      return;
    }

    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = await import('docx');
      const { saveAs } = await import('file-saver');

      const children = [
        new Paragraph({
          text: "Election Results - Ignite Club (Winners Summary)",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: `Generated on: ${new Date().toLocaleString()}`,
          spacing: { after: 400 }
        })
      ];

      // --- PAGE 1: WINNERS SUMMARY ---
      ['6th', '4th'].reverse().forEach(sem => {
        children.push(new Paragraph({
          text: `${sem} Semester Winners`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }));

        POSTS_BY_SEMESTER[sem].forEach(post => {
          const cans = nominations.filter(c => c.semester === sem && c.posts?.includes(post) && c.status === 'accepted');

          if (cans.length === 0) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${formatPostName(post)}: `, bold: true }),
                new TextRun({ text: "No applications.", italics: true, color: "888888" })
              ],
              spacing: { before: 100 }
            }));
            return;
          }

          if (cans.length === 1) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${formatPostName(post)}: `, bold: true }),
                new TextRun({ text: `${cans[0].name} (Uncontested Winner)`, color: "D97706", bold: true })
              ],
              spacing: { before: 100 }
            }));
            return;
          }

          const postVotes = votesData.map(v => ({ candidateEmail: v.votes?.[post] })).filter(v => v.candidateEmail);
          const voteCounts: Record<string, number> = {};
          postVotes.forEach(v => {
            voteCounts[v.candidateEmail] = (voteCounts[v.candidateEmail] || 0) + 1;
          });

          const maxVotes = Math.max(0, ...Object.values(voteCounts));
          const winnersCount = cans.filter(c => (voteCounts[c.email] || 0) === maxVotes).length;

          if (maxVotes === 0) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${formatPostName(post)}: `, bold: true }),
                new TextRun({ text: "No votes cast yet.", italics: true, color: "888888" })
              ],
              spacing: { before: 100 }
            }));
          } else if (winnersCount === 1) {
            const winner = cans.find(c => (voteCounts[c.email] || 0) === maxVotes);
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${formatPostName(post)}: `, bold: true }),
                new TextRun({ text: `${winner?.name} `, color: "D97706", bold: true }),
                new TextRun({ text: `(${maxVotes} votes)` })
              ],
              spacing: { before: 100 }
            }));
          } else {
            const tiedCans = cans.filter(c => (voteCounts[c.email] || 0) === maxVotes).map(c => c.name);
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${formatPostName(post)}: `, bold: true }),
                new TextRun({ text: `TIE BETWEEN: ${tiedCans.join(', ')} `, color: "FF0000", bold: true }),
                new TextRun({ text: `(${maxVotes} votes each)` })
              ],
              spacing: { before: 100 }
            }));
          }
        });
      });

      // --- PAGE 2: DETAILED VOTE LOGS & TIMESTAMPS ---
      children.push(new Paragraph({
        children: [new PageBreak()]
      }));

      children.push(new Paragraph({
        text: "Detailed Vote Logs & Timestamps",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 400 }
      }));

      ['6th', '4th'].reverse().forEach(sem => {
        children.push(new Paragraph({
          text: `${sem} Semester Detailed Logs`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }));

        POSTS_BY_SEMESTER[sem].forEach(post => {
          const cans = nominations.filter(c => c.semester === sem && c.posts?.includes(post) && c.status === 'accepted');
          
          if (cans.length === 0) return; // Skip posts with no candidates on detailed logs

          children.push(new Paragraph({
            text: `Post: ${formatPostName(post)} ${cans.length === 1 ? '(Uncontested)' : ''}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 }
          }));

          const postVotesRaw = votesData.filter(v => v.votes?.[post]).map(v => {
            const dateObj = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
            return {
              candidateEmail: v.votes[post],
              timeDate: dateObj,
              timeStr: dateObj.toLocaleString()
            };
          }).sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());

          const sortedCans = [...cans].sort((a,b) => {
             const aVotes = postVotesRaw.filter(v => v.candidateEmail === a.email).length;
             const bVotes = postVotesRaw.filter(v => v.candidateEmail === b.email).length;
             return bVotes - aVotes;
          });

          sortedCans.forEach(c => {
             const cVotes = postVotesRaw.filter(v => v.candidateEmail === c.email);
             
             children.push(new Paragraph({
               children: [
                 new TextRun({ text: `${c.name} - ${cVotes.length} votes`, bold: true })
               ],
               spacing: { before: 150, after: 50 },
             }));

             if (cVotes.length === 0) {
               children.push(new Paragraph({
                 children: [new TextRun({ text: "      No votes recorded.", italics: true, color: "888888" })]
               }));
             } else {
               cVotes.forEach((vLog, i) => {
                  children.push(new Paragraph({
                     children: [new TextRun({ text: `      [Vote ${i + 1}]  Anonymous Voter  --  ${vLog.timeStr}` })],
                     spacing: { after: 50 }
                  }));
               });
             }
          });
        });
      });

      const docx = new Document({
        sections: [{ properties: {}, children }]
      });

      const blob = await Packer.toBlob(docx);
      saveAs(blob, `Election_Results_${Date.now()}.docx`);
    } catch (err) {
      console.error('Word generation error:', err);
      alert('Could not generate Word document. Please ensure docx is installed.');
    }
  };

  const filtered = nominations.filter(n => {
    const mS = filterStatus === 'all' || n.status === filterStatus;
    const mSem = filterSemester === 'all' || n.semester === filterSemester;
    const mP = filterPost === 'all' || n.posts?.includes(filterPost);
    return mS && mSem && mP;
  });

  if (!isFirebaseConfigured) return <div className="p-20 text-white text-center">Firebase Not Configured</div>;
  if (!isLoggedIn) {
     if (resetMode) {
       return (
         <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
           <form onSubmit={handleReset} className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm border border-slate-700 space-y-4 shadow-2xl">
             <div className="text-center space-y-2">
                <div className="text-4xl">🔑</div>
                <h1 className="text-xl font-bold text-white">Reset Password</h1>
                <p className="text-[10px] text-slate-400 font-medium pb-2">To uniquely reset the offline password, provide your Secret Security PIN.</p>
             </div>
             {resetError && <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-widest">{resetError}</p>}
             {resetSuccess && <p className="text-green-400 text-[10px] font-bold text-center uppercase tracking-widest">{resetSuccess}</p>}
             <div className="space-y-4">
                <input type="email" placeholder="Admin Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" required />
                <input type="password" placeholder="Security PIN" value={resetPin} onChange={e => setResetPin(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" required />
                <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" minLength={6} required />
             </div>
             <button type="submit" className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-xl uppercase tracking-widest text-sm shadow-xl shadow-amber-500/10 active:scale-95 transition-all">Update Password</button>
             <div className="text-center mt-4">
               <button type="button" onClick={() => setResetMode(false)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors">Back to Login</button>
             </div>
           </form>
         </div>
       );
     }

     return (
       <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
         <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm border border-slate-700 space-y-4 shadow-2xl">
           <div className="text-center space-y-2">
              <div className="text-4xl">🔐</div>
              <h1 className="text-xl font-bold text-white">Admin Login</h1>
           </div>
           {loginError && <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-widest">{loginError}</p>}
           <div className="space-y-4">
              <input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" required />
           </div>
           <div className="flex justify-end px-1 pt-2">
             <button type="button" onClick={() => setResetMode(true)} className="text-[10px] uppercase font-bold text-slate-500 hover:text-amber-500 transition-colors">Forgot Password?</button>
           </div>
           <button type="submit" className="w-full py-4 mt-4 bg-amber-500 text-slate-900 font-black rounded-xl uppercase tracking-widest text-sm shadow-xl shadow-amber-500/10 active:scale-95 transition-all">{loginLoading ? 'Logging in...' : 'Log In'}</button>
         </form>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-8 px-4 font-sans text-slate-300">
      
      {/* Modals */}
      {previewPhoto && <div onClick={() => setPreviewPhoto('')} className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center cursor-pointer p-4 backdrop-blur-md"><img src={previewPhoto} className="max-w-md w-full rounded-3xl shadow-2xl border-2 border-white/10" alt="Preview" /></div>}
      
      {viewReasons && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-8 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
               <div><h3 className="text-xl font-bold text-white">Why I Want This Post</h3><p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">Student: {viewReasons.name}</p></div>
               <button onClick={() => setViewReasons(null)} className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 font-bold transition-colors">×</button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
               {Object.entries(viewReasons.data).map(([post, reason]) => (
                 <div key={post} className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{post}</p>
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700">
                       <p className="text-sm italic text-slate-300 leading-relaxed font-medium">"{reason}"</p>
                    </div>
                 </div>
               ))}
               {Object.keys(viewReasons.data).length === 0 && <p className="text-center py-10 opacity-20 italic">No specific statements found.</p>}
            </div>
            <div className="p-6 bg-slate-900/30 text-center"><button onClick={() => setViewReasons(null)} className="px-10 py-3 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-colors">Close</button></div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between items-end gap-6">
           <div><h1 className="text-3xl font-bold text-white">Election Dashboard</h1><p className="text-slate-500 text-sm mt-1">Live view of all submitted nominations</p></div>
           <div className="flex items-center gap-4">
              <button 
                onClick={generateAcceptedPDF}
                className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-900 border border-amber-500/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xl active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Accepted (PDF)
              </button>
              <button 
                onClick={generateResultsWord}
                className="px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xl active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Results (Word)
              </button>
              <div className="bg-slate-800/80 p-1 rounded-2xl border border-slate-700 flex">
                <button onClick={() => setViewMode('posts')} className={`px-6 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'posts' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>By Post</button>
                <button onClick={() => setViewMode('table')} className={`px-6 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>Table</button>
                <button onClick={() => setViewMode('votes')} className={`px-6 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'votes' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>Live Votes</button>
              </div>
              <button onClick={handleLogout} className="px-5 py-2.5 bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-xs font-semibold transition-all">Sign Out</button>
           </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {[ {l: 'Total Applications', v: nominations.length}, {l: 'Pending Review', v: nominations.filter(n => n.status === 'pending').length}, {l: 'Accepted', v: nominations.filter(n => n.status === 'accepted').length}, {l: 'Rejected', v: nominations.filter(n => n.status === 'rejected').length} ].map(s => (
             <div key={s.l} className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-slate-700 text-center space-y-1 backdrop-blur-sm">
                <p className="text-4xl font-bold text-white tracking-tighter">{s.v}</p>
                <p className="text-xs text-slate-500">{s.l}</p>
             </div>
           ))}
        </div>

        {/* Filtration */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-[2rem] p-5 shadow-xl backdrop-blur-sm">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold text-amber-500 outline-none cursor-pointer">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
             </select>
             <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold text-amber-500 outline-none cursor-pointer">
                <option value="all">All Semesters</option>
                <option value="4th">4th Sem</option>
                <option value="6th">6th Sem</option>
             </select>
             <select value={filterPost} onChange={e => setFilterPost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold text-amber-500 outline-none cursor-pointer">
                <option value="all">All Posts</option>
                {(filterSemester === 'all' ? ALL_POSTS : POSTS_BY_SEMESTER[filterSemester]).map(post => <option key={post} value={post}>{post}</option>)}
             </select>
           </div>
        </div>

        {viewMode === 'table' && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-800/80 text-xs font-semibold text-slate-500 border-b border-slate-700">
                   <tr><th className="p-6">Student Name</th><th className="p-6">Applied For</th><th className="p-6">Statement</th><th className="p-6 text-center">Status</th><th className="p-6 text-right">Decision</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                   {filtered.map(n => (
                     <tr key={n.id} className="hover:bg-slate-700/10 transition-colors">
                        <td className="p-6 flex items-center gap-6">
                           <img src={n.photo_base64} onClick={() => setPreviewPhoto(n.photo_base64)} className="w-20 h-20 rounded-2xl object-cover cursor-pointer hover:ring-4 hover:ring-amber-500 transition-all border-2 border-slate-700 shadow-xl" title="View Full Photo" />
                           <div>
                             <p className="text-white font-black text-sm md:text-base uppercase">{n.name}</p>
                             <p className="text-xs font-bold text-slate-500">{n.email}</p>
                             <p className="text-[10px] md:text-xs font-black text-amber-500/80 uppercase mt-1">{n.semester} Sem{n.year ? ` • ${n.year}` : ''}</p>
                           </div>
                        </td>
                        <td className="p-6">
                           <div className="flex flex-wrap gap-2">{n.posts.map(p => <span key={p} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">{p}</span>)}</div>
                        </td>
                        <td className="p-6">
                           <button onClick={() => setViewReasons({name: n.name, data: n.post_statements || (n.statement ? {'General Statement': n.statement} : {})})} className="px-5 py-2.5 bg-slate-700/50 hover:bg-amber-500/10 border border-slate-700 hover:border-amber-500/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-amber-500 transition-all">Read Statement</button>
                        </td>
                        <td className="p-6 text-center"><span className={`text-[8px] font-black uppercase px-4 py-1.5 rounded-full border ${n.status==='accepted'?'bg-green-500/10 text-green-400 border-green-500/20':n.status==='rejected'?'bg-red-500/10 text-red-500 border-red-500/20':'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{n.status}</span></td>
                        <td className="p-6 text-right">
                           {n.status === 'pending' ? (
                              <div className="flex justify-end gap-3"><button onClick={() => updateStatus(n.id, 'accepted')} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-lg active:scale-95">Accept</button><button onClick={() => updateStatus(n.id, 'rejected')} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-lg active:scale-95">Reject</button></div>
                           ) : (
                              <button onClick={() => updateStatus(n.id, 'pending')} className="text-[8px] font-black text-slate-600 uppercase underline hover:text-amber-500 transition-colors">Reset</button>
                           )}
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}
        
        {viewMode === 'posts' && (
          <div className="space-y-16">
             {['6th', '4th'].reverse().map(sem => (
               <div key={sem} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex items-center gap-6"><h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-xs font-black">{sem[0]}</span> {sem} Semester Applications</h2><div className="h-px flex-1 bg-slate-700/50" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {POSTS_BY_SEMESTER[sem].map(post => {
                       const apps = nominations.filter(a => a.posts?.includes(post) && (filterStatus === 'all' || a.status === filterStatus));
                       return (
                         <div key={post} className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] p-8 space-y-6 hover:border-amber-500/30 transition-all flex flex-col group backdrop-blur-sm shadow-xl">
                            <div className="flex justify-between items-start"><h3 className="text-xs font-black text-white uppercase tracking-[0.2em] group-hover:text-amber-500 transition-colors">{formatPostName(post)}</h3><span className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-[10px] font-black text-amber-500">{apps.length} Total</span></div>
                            <div className="flex-1 space-y-4">
                               {apps.map(a => (
                                 <div key={a.id} className="flex items-center justify-between p-5 bg-slate-900/40 border border-slate-700/40 rounded-[2rem] hover:bg-slate-900/80 transition-all group/bid hover:shadow-xl">
                                    <div className="flex items-center gap-5">
                                       <img src={a.photo_base64} onClick={() => setPreviewPhoto(a.photo_base64)} className="w-16 h-16 md:w-20 md:h-20 rounded-[1.25rem] object-cover cursor-pointer border-2 border-slate-700 shadow-lg" alt="Face" />
                                       <div>
                                          <p className="text-xs md:text-sm font-black text-white uppercase group-hover/bid:text-amber-400 w-32 md:w-48 transition-colors truncate">{a.name}</p>
                                          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 mt-0.5">{a.email}</p>
                                          <p className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">{a.status}</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover/bid:opacity-100 transition-opacity">
                                       <button onClick={() => setViewReasons({name: a.name, data: a.post_statements || (a.statement ? {'General': a.statement} : {})})} className="p-2 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                                       {a.status === 'pending' && <><button onClick={() => updateStatus(a.id, 'accepted')} className="p-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7"/></svg></button><button onClick={() => updateStatus(a.id, 'rejected')} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12"/></svg></button></>}
                                    </div>
                                 </div>
                               ))}
                               {apps.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-700 tracking-widest italic uppercase opacity-40">No applications yet</p>}
                            </div>
                         </div>
                       );
                     })}
                  </div>
               </div>
             ))}
          </div>
        )}

        {viewMode === 'votes' && (
          <div className="space-y-16">
            <div className="flex flex-col gap-6 bg-slate-800/40 border border-slate-700/60 rounded-[2rem] p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-4"><span className="text-3xl">📊</span> Live Election Results</h2>
                <p className="text-amber-500 text-sm font-bold bg-amber-500/10 px-4 py-2 rounded-xl">{votesData.length} Total Votes Cast</p>
              </div>
              <input 
                type="text" 
                placeholder="Search vote log by voter email or name..." 
                value={searchVoterQuery}
                onChange={e => setSearchVoterQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-amber-500 transition-all placeholder-slate-500"
              />
            </div>
            {['6th', '4th'].reverse().map(sem => {
              const postsForSem = POSTS_BY_SEMESTER[sem];
              return (
                <div key={sem} className="space-y-8">
                  <h3 className="text-xl font-bold text-slate-300 border-b border-slate-700/50 pb-4">{sem} Semester Data</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {postsForSem.map(post => {
                      // Candidates for this post
                      const cans = nominations.filter(c => c.semester === sem && c.posts?.includes(post) && c.status === 'accepted');
                      if (cans.length <= 1) return null; // No voting happened for this post
                      
                      // Count votes
                      const postVotes = votesData.map(v => ({ voter: v.name || v.email, voterEmail: v.email, candidateEmail: v.votes?.[post], time: v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp) })).filter(v => v.candidateEmail);
                      
                      const voteCounts: Record<string, number> = {};
                      postVotes.forEach(v => {
                        voteCounts[v.candidateEmail] = (voteCounts[v.candidateEmail] || 0) + 1;
                      });

                      const maxVotes = Math.max(0, ...Object.values(voteCounts));
                      const winnersCount = cans.filter(c => (voteCounts[c.email] || 0) === maxVotes).length;

                      return (
                        <div key={post} className="bg-slate-800/60 border border-slate-700 rounded-[2rem] p-8 shadow-2xl flex flex-col gap-6">
                            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                              <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">{formatPostName(post)}</h4>
                              <span className="text-xs font-bold text-slate-400">{postVotes.length} Votes</span>
                            </div>

                            <div className="space-y-4">
                              {cans.map(c => {
                                const count = voteCounts[c.email] || 0;
                                const isWinner = count > 0 && count === maxVotes && winnersCount === 1;
                                const percent = postVotes.length > 0 ? (count / postVotes.length) * 100 : 0;
                                
                                return (
                                  <div key={c.email} className={`relative p-5 md:p-6 rounded-[2rem] border-2 transition-all ${isWinner ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-900/40 border-slate-700/40'}`}>
                                    <div className="flex items-center gap-6 relative z-10">
                                      <img src={c.photo_base64} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-slate-700 shadow-md" alt="Candidate" />
                                      <div className="flex-1">
                                        <p className="text-sm md:text-lg font-black text-white uppercase">{c.name}</p>
                                        <p className="text-xs md:text-sm font-bold text-slate-400 mt-1">{count} <span className="font-medium text-slate-500">Votes</span></p>
                                      </div>
                                    </div>
                                    <div className="absolute top-0 left-0 h-full bg-amber-500/20 rounded-[2rem] transition-all duration-1000" style={{ width: `${percent}%` }} />
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-700/50 max-h-64 overflow-y-auto custom-scrollbar">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Detailed Vote Log {searchVoterQuery && <span className="text-amber-500 lowercase">({searchVoterQuery})</span>}</p>
                              {(() => {
                                const filteredLog = postVotes.sort((a,b) => b.time.getTime() - a.time.getTime()).filter(v => 
                                  v.voter.toLowerCase().includes(searchVoterQuery.toLowerCase()) || 
                                  v.voterEmail.toLowerCase().includes(searchVoterQuery.toLowerCase())
                                );
                                
                                if (filteredLog.length === 0) {
                                  return <p className="text-[10px] text-slate-600 italic">No votes found.</p>;
                                }

                                return (
                                  <ul className="space-y-3">
                                    {filteredLog.map((v, i) => {
                                      const votedFor = cans.find(c => c.email === v.candidateEmail)?.name || 'Unknown';
                                      const displayVoter = 'Anonymous Voter';
                                      return (
                                        <li key={i} className="text-xs md:text-sm text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                                          <span className="font-bold text-white">{displayVoter}</span> voted for <span className="text-amber-500 font-bold">{votedFor}</span>
                                          <div className="text-slate-500 text-[10px] md:text-xs mt-1.5 font-medium">{v.time.toLocaleString()}</div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                );
                              })()}
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
