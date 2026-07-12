import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileSignature, FileHeart, History, Trash2, Download, Copy, Plus } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface SavedResume {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string;
  date: string;
}

interface BuiltResume {
  id: string;
  name: string;
  jobTitle: string;
  date: string;
  data: any;
  template: string;
}

interface CoverLetter {
  id: string;
  title: string;
  content: string;
  analysis: string;
  date: string;
}

interface MatchRecord {
  id: string;
  company: string;
  job_title: string;
  score: number;
  date: string;
}

export default function Library() {
  useSEO(
    "Document Library - Saved Resumes & Cover Letters",
    "Manage all your uploaded CVs, built resumes, cover letters, and scan history stored securely in your browser."
  );

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'uploaded' | 'built' | 'letters' | 'history'>('uploaded');
  
  const [uploaded, setUploaded] = useState<SavedResume[]>([]);
  const [built, setBuilt] = useState<BuiltResume[]>([]);
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [history, setHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    // Load uploaded resumes
    const savedUploaded = localStorage.getItem('uploaded_resumes');
    if (savedUploaded) setUploaded(JSON.parse(savedUploaded));

    // Load built resumes
    const savedBuilt = localStorage.getItem('built_resumes');
    if (savedBuilt) setBuilt(JSON.parse(savedBuilt));

    // Load cover letters
    const savedLetters = localStorage.getItem('cover_letters');
    if (savedLetters) setLetters(JSON.parse(savedLetters));

    // Load match history
    const savedHistory = localStorage.getItem('match_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const deleteUploaded = (id: string) => {
    const updated = uploaded.filter(r => r.id !== id);
    localStorage.setItem('uploaded_resumes', JSON.stringify(updated));
    setUploaded(updated);
  };

  const deleteBuilt = (id: string) => {
    const updated = built.filter(r => r.id !== id);
    localStorage.setItem('built_resumes', JSON.stringify(updated));
    setBuilt(updated);
  };

  const deleteLetter = (id: string) => {
    const updated = letters.filter(l => l.id !== id);
    localStorage.setItem('cover_letters', JSON.stringify(updated));
    setLetters(updated);
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    localStorage.setItem('match_history', JSON.stringify(updated));
    setHistory(updated);
  };

  const copyLetterContent = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("Cover letter text copied to clipboard.");
  };

  const downloadFile = (name: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="page-wrapper container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 className="page-title" style={{ margin: '0' }}>Document Library</h1>
          <p className="page-subtitle">Manage, view, and download all your resumes, cover letters, and match scans.</p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/build')}>
          <Plus className="w-4 h-4 mr-1.5" />
          Build New Resume
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--dark-border)', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'uploaded', label: 'Uploaded Resumes', icon: FileText },
          { id: 'built', label: 'Built Resumes', icon: FileSignature },
          { id: 'letters', label: 'Cover Letters', icon: FileHeart },
          { id: 'history', label: 'Scan History', icon: History }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`btn ${isActive ? 'nav-link-active' : 'btn-secondary'}`}
              style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13.5px' }}
            >
              <Icon className="w-4 h-4 mr-1.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* UPLOADED TAB */}
      {activeTab === 'uploaded' && (
        <div className="animate-fade-in">
          {uploaded.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FileText className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>No Uploaded Resumes</h3>
              <p style={{ color: 'var(--dark-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Upload your current resume to perform ATS matches against job details.</p>
              <button className="btn btn-primary" onClick={() => navigate('/match')}>Upload & Match</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {uploaded.map(r => (
                <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(79,70,229,0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '10px' }}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 className="file-name" style={{ fontSize: '15px' }}>{r.name}</h4>
                      <p style={{ color: 'var(--dark-text-secondary)', fontSize: '12px', marginTop: '2px' }}>Uploaded on {r.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--dark-border)', paddingTop: '14px', marginTop: '16px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.1)' }} onClick={() => deleteUploaded(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12.5px' }} onClick={() => navigate('/match')}>
                      Match Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BUILT TAB */}
      {activeTab === 'built' && (
        <div className="animate-fade-in">
          {built.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FileSignature className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>No Built Resumes</h3>
              <p style={{ color: 'var(--dark-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Design a clean, professional, and compatible resume in minutes.</p>
              <button className="btn btn-primary" onClick={() => navigate('/build')}>Build Resume</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {built.map(r => (
                <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                      <FileSignature className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="file-name" style={{ fontSize: '15px' }}>{r.name}</h4>
                      <p style={{ color: 'var(--dark-text-secondary)', fontSize: '12px', marginTop: '2px' }}>{r.jobTitle}</p>
                      <p style={{ color: 'var(--dark-text-secondary)', fontSize: '11px', marginTop: '2px' }}>Created {r.date} • Template: {r.template}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--dark-border)', paddingTop: '14px', marginTop: '16px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.1)' }} onClick={() => deleteBuilt(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12.5px', backgroundColor: '#10b981' }} 
                      onClick={() => {
                        // Restore draft to edit it
                        localStorage.setItem('resume_builder_draft', JSON.stringify(r.data));
                        navigate('/build');
                      }}
                    >
                      Edit & Export
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COVER LETTERS TAB */}
      {activeTab === 'letters' && (
        <div className="animate-fade-in">
          {letters.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FileHeart className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>No Cover Letters</h3>
              <p style={{ color: 'var(--dark-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Generate a tailored cover letter customized specifically to your experience.</p>
              <button className="btn btn-primary" onClick={() => navigate('/cover-letter')}>Generate Letter</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              {letters.map(l => (
                <div key={l.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--dark-border)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileHeart className="w-5 h-5 text-indigo-400" />
                      <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{l.title}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>• Generated {l.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => copyLetterContent(l.content)}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => downloadFile(l.title, l.content)}>
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 8px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.1)' }} onClick={() => deleteLetter(l.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px', fontSize: '13.5px', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
                    {l.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCAN HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="animate-fade-in">
          {history.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <History className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>No Scans Yet</h3>
              <p style={{ color: 'var(--dark-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Your match records and score history will be logged here.</p>
              <button className="btn btn-primary" onClick={() => navigate('/match')}>Scan Resume</button>
            </div>
          ) : (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--dark-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px 20px', color: '#fff', fontWeight: '700' }}>Company</th>
                    <th style={{ padding: '16px 20px', color: '#fff', fontWeight: '700' }}>Position</th>
                    <th style={{ padding: '16px 20px', color: '#fff', fontWeight: '700' }}>Match Score</th>
                    <th style={{ padding: '16px 20px', color: '#fff', fontWeight: '700' }}>Date</th>
                    <th style={{ padding: '16px 20px', color: '#fff', fontWeight: '700', width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--dark-border)' }}>
                      <td style={{ padding: '16px 20px', color: '#fff', fontWeight: '600' }}>{h.company}</td>
                      <td style={{ padding: '16px 20px', color: 'var(--dark-text-secondary)' }}>{h.job_title}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ 
                          backgroundColor: h.score >= 75 ? 'rgba(16,185,129,0.1)' : h.score >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: h.score >= 75 ? '#10b981' : h.score >= 40 ? '#f59e0b' : '#ef4444',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontWeight: '700',
                          fontSize: '12.5px'
                        }}>
                          {h.score}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--dark-text-secondary)' }}>{h.date}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => deleteHistory(h.id)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
