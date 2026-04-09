'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { isFirebaseConfigured, auth, db } from '@/lib/firebase';
import { POSTS_BY_SEMESTER, ALL_POSTS } from '@/lib/constants';

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

  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterPost, setFilterPost]         = useState('all');
  const [viewMode, setViewMode]             = useState<'table' | 'posts'>('posts');

  const [previewPhoto, setPreviewPhoto] = useState('');
  const [viewReasons, setViewReasons]   = useState<{name: string, data: Record<string, string>} | null>(null);

  useEffect(() => {
    if (!auth) return;
    // Force logout on entry to ensure the credential form is always seen first
    signOut(auth).then(() => {
      setIsLoggedIn(false);
    });

    const unsub = auth.onAuthStateChanged((u: any) => {
      if (u) setIsLoggedIn(true);
      else setIsLoggedIn(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !db) return;
    const unsub = onSnapshot(collection(db, 'nominations'), snapshot => {
      const noms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Nomination));
      noms.sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));
      setNominations(noms);
    });
    return unsub;
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoginLoading(true); setLoginError('');
    try { await signInWithEmailAndPassword(auth, adminEmail, password); }
    catch { setLoginError('Invalid credentials.'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => auth && signOut(auth);

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

  const filtered = nominations.filter(n => {
    const mS = filterStatus === 'all' || n.status === filterStatus;
    const mSem = filterSemester === 'all' || n.semester === filterSemester;
    const mP = filterPost === 'all' || n.posts?.includes(filterPost);
    return mS && mSem && mP;
  });

  if (!isFirebaseConfigured) return <div className="p-20 text-white text-center">Firebase Not Configured</div>;
  if (!isLoggedIn) {
     return (
       <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
         <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm border border-slate-700 space-y-4 shadow-2xl">
           <div className="text-center space-y-2">
              <div className="text-4xl">🔐</div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Admin Gate</h1>
           </div>
           {loginError && <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-widest">{loginError}</p>}
           <div className="space-y-4">
              <input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm" required />
           </div>
           <button type="submit" className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-xl uppercase tracking-widest text-sm shadow-xl shadow-amber-500/10 active:scale-95 transition-all">{loginLoading ? 'Opening...' : 'Login'}</button>
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
               <div><h3 className="text-xl font-black text-white uppercase tracking-tight">Candidate Statements</h3><p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">Candidate: {viewReasons.name}</p></div>
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
            <div className="p-6 bg-slate-900/30 text-center"><button onClick={() => setViewReasons(null)} className="px-10 py-3 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-colors">Close Record</button></div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between items-end gap-6">
           <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Election Dashboard</h1><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Live Nominations Overview</p></div>
           <div className="flex items-center gap-4">
              <button 
                onClick={generateAcceptedPDF}
                className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-900 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 shadow-xl active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Accepted (PDF)
              </button>
              <div className="bg-slate-800/80 p-1 rounded-2xl border border-slate-700 flex">
                <button onClick={() => setViewMode('posts')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'posts' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>Post View</button>
                <button onClick={() => setViewMode('table')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'table' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>Table View</button>
              </div>
              <button onClick={handleLogout} className="px-5 py-2.5 bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[9px] font-black uppercase transition-all">Sign Out</button>
           </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {[ {l: 'Applications', v: nominations.length}, {l: 'Pending', v: nominations.filter(n => n.status === 'pending').length}, {l: 'Verified', v: nominations.filter(n => n.status === 'accepted').length}, {l: 'Denied', v: nominations.filter(n => n.status === 'rejected').length} ].map(s => (
             <div key={s.l} className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-slate-700 text-center space-y-1 backdrop-blur-sm">
                <p className="text-4xl font-black text-white tracking-tighter">{s.v}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.l}</p>
             </div>
           ))}
        </div>

        {/* Filtration */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-[2rem] p-5 shadow-xl backdrop-blur-sm">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-amber-500 outline-none cursor-pointer">
                <option value="all">Any Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
             </select>
             <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-amber-500 outline-none cursor-pointer">
                <option value="all">Any Year</option>
                <option value="4th">4th Sem</option>
                <option value="6th">6th Sem</option>
             </select>
             <select value={filterPost} onChange={e => setFilterPost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-amber-500 outline-none cursor-pointer">
                <option value="all">Every Post / Level</option>
                {(filterSemester === 'all' ? ALL_POSTS : POSTS_BY_SEMESTER[filterSemester]).map(post => <option key={post} value={post}>{post}</option>)}
             </select>
           </div>
        </div>

        {viewMode === 'table' ? (
          <div className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-800/80 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-700">
                   <tr><th className="p-6">Candidate</th><th className="p-6">Applied Post</th><th className="p-6">Statement</th><th className="p-6 text-center">Status</th><th className="p-6 text-right">Decision</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                   {filtered.map(n => (
                     <tr key={n.id} className="hover:bg-slate-700/10 transition-colors">
                        <td className="p-6 flex items-center gap-4">
                           <img src={n.photo_base64} onClick={() => setPreviewPhoto(n.photo_base64)} className="w-14 h-14 rounded-2xl object-cover cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all border border-slate-700 shadow-lg" title="View Full Photo" />
                           <div>
                             <p className="text-white font-black text-xs uppercase">{n.name}</p>
                             <p className="text-[10px] font-bold text-slate-500">{n.email}</p>
                             <p className="text-[9px] font-black text-amber-500/80 uppercase">{n.semester} Sem{n.year ? ` • ${n.year}` : ''}</p>
                           </div>
                        </td>
                        <td className="p-6">
                           <div className="flex flex-wrap gap-2">{n.posts.map(p => <span key={p} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">{p}</span>)}</div>
                        </td>
                        <td className="p-6">
                           <button onClick={() => setViewReasons({name: n.name, data: n.post_statements || (n.statement ? {'General Statement': n.statement} : {})})} className="px-5 py-2.5 bg-slate-700/50 hover:bg-amber-500/10 border border-slate-700 hover:border-amber-500/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-amber-500 transition-all">Review Statement</button>
                        </td>
                        <td className="p-6 text-center"><span className={`text-[8px] font-black uppercase px-4 py-1.5 rounded-full border ${n.status==='accepted'?'bg-green-500/10 text-green-400 border-green-500/20':n.status==='rejected'?'bg-red-500/10 text-red-500 border-red-500/20':'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{n.status}</span></td>
                        <td className="p-6 text-right">
                           {n.status === 'pending' ? (
                              <div className="flex justify-end gap-3"><button onClick={() => updateStatus(n.id, 'accepted')} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-lg active:scale-95">Accept</button><button onClick={() => updateStatus(n.id, 'rejected')} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-lg active:scale-95">Reject</button></div>
                           ) : (
                              <button onClick={() => updateStatus(n.id, 'pending')} className="text-[8px] font-black text-slate-600 uppercase underline hover:text-amber-500 transition-colors">Reset Status</button>
                           )}
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        ) : (
          <div className="space-y-16">
             {['6th', '4th'].reverse().map(sem => (
               <div key={sem} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex items-center gap-6"><h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-xs font-black">{sem[0]}</span> {sem} Semester Bids</h2><div className="h-px flex-1 bg-slate-700/50" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {POSTS_BY_SEMESTER[sem].map(post => {
                       const apps = nominations.filter(a => a.posts?.includes(post) && (filterStatus === 'all' || a.status === filterStatus));
                       return (
                         <div key={post} className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] p-8 space-y-6 hover:border-amber-500/30 transition-all flex flex-col group backdrop-blur-sm shadow-xl">
                            <div className="flex justify-between items-start"><h3 className="text-xs font-black text-white uppercase tracking-[0.2em] group-hover:text-amber-500 transition-colors">{post}</h3><span className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-[10px] font-black text-amber-500">{apps.length} Total</span></div>
                            <div className="flex-1 space-y-4">
                               {apps.map(a => (
                                 <div key={a.id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-700/40 rounded-[1.5rem] hover:bg-slate-900/80 transition-all group/bid hover:shadow-lg">
                                    <div className="flex items-center gap-4">
                                       <img src={a.photo_base64} onClick={() => setPreviewPhoto(a.photo_base64)} className="w-10 h-10 rounded-xl object-cover cursor-pointer border border-slate-700" alt="Face" />
                                       <div><p className="text-[10px] font-black text-white uppercase group-hover/bid:text-amber-400 truncate w-24 transition-colors">{a.name}</p><p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{a.status}</p></div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover/bid:opacity-100 transition-opacity">
                                       <button onClick={() => setViewReasons({name: a.name, data: a.post_statements || (a.statement ? {'General': a.statement} : {})})} className="p-2 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                                       {a.status === 'pending' && <><button onClick={() => updateStatus(a.id, 'accepted')} className="p-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7"/></svg></button><button onClick={() => updateStatus(a.id, 'rejected')} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12"/></svg></button></>}
                                    </div>
                                 </div>
                               ))}
                               {apps.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-700 tracking-widest italic uppercase opacity-40">No Nominations Yet</p>}
                            </div>
                         </div>
                       );
                     })}
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
