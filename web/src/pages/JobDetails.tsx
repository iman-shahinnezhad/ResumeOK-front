import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, FileText, CheckCircle2, Building, MapPin, DollarSign, Calendar } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function JobDetails() {
  const navigate = useNavigate();
  useSEO("Job Application Details", "Manage job status, AI tailoring, and application steps.");

  const [jobStatus, setJobStatus] = useState<'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'>('Interviewing');
  const [notes, setNotes] = useState('Passed initial recruiter screening. Technical round focused on React performance & State architecture.');

  return (
    <div className="container page-wrapper animate-fade-in">
      <button 
        className="btn btn-secondary" 
        style={{ marginBottom: '24px', padding: '8px 16px', fontSize: '13px' }}
        onClick={() => navigate('/jobs')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs Tracker
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Main Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Senior Frontend Engineer</h1>
                <div style={{ fontSize: '18px', color: '#818cf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building className="w-5 h-5" /> Stripe
                </div>
              </div>
              <div style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: '800' }}>
                92% ATS Match
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: 'var(--dark-text-secondary)', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin className="w-4 h-4 text-indigo-400" /> Remote</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign className="w-4 h-4 text-emerald-400" /> $160k - $190k</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar className="w-4 h-4 text-amber-400" /> Applied on July 28, 2026</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={() => navigate('/match')}>
                <Zap className="w-4 h-4 mr-2" /> Tailor Resume For This Job
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/cover-letter')}>
                <FileText className="w-4 h-4 mr-2" /> Generate Cover Letter
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Application Notes</h2>
            <textarea 
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about the interview process, company culture..."
            />
            <button className="btn btn-primary" style={{ marginTop: '16px' }}>Save Notes</button>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Application Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setJobStatus(st)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: jobStatus === st ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: jobStatus === st ? '#818cf8' : 'var(--dark-text-secondary)',
                    border: jobStatus === st ? '1px solid #6366f1' : '1px solid var(--dark-border)'
                  }}
                >
                  {st}
                  {jobStatus === st && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
