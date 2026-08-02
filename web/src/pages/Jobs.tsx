import { useState } from 'react';
import { Plus, Search, Calendar, MapPin, DollarSign, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

interface JobApp {
  id: string;
  company: string;
  title: string;
  location: string;
  salary?: string;
  status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';
  appliedDate: string;
  matchScore: number;
  url?: string;
  notes?: string;
}

export default function Jobs() {
  useSEO(
    "Job Application Tracker - ResumeOK",
    "Track all your job applications, saved roles, interviews, and offer statuses in one clean dashboard."
  );

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const [jobs, setJobs] = useState<JobApp[]>([
    {
      id: 'job-1',
      company: 'Stripe',
      title: 'Senior Frontend Engineer',
      location: 'Remote',
      salary: '$160k - $190k',
      status: 'Interviewing',
      appliedDate: '2026-07-28',
      matchScore: 92,
      url: 'https://stripe.com/jobs',
      notes: 'Passed technical screen. System design interview scheduled for Tuesday.'
    },
    {
      id: 'job-2',
      company: 'Linear',
      title: 'Product Engineer',
      location: 'San Francisco, CA',
      salary: '$150k - $180k',
      status: 'Applied',
      appliedDate: '2026-07-30',
      matchScore: 88,
      url: 'https://linear.app/careers',
      notes: 'Applied with tailored resume via ResumeOK extension.'
    },
    {
      id: 'job-3',
      company: 'Vercel',
      title: 'React Specialist',
      location: 'Remote',
      salary: '$170k - $200k',
      status: 'Saved',
      appliedDate: '2026-08-01',
      matchScore: 85,
      url: 'https://vercel.com/careers',
      notes: 'High priority match score. Need to update portfolio link before applying.'
    }
  ]);

  const [newJob, setNewJob] = useState({
    company: '',
    title: '',
    location: 'Remote',
    salary: '',
    status: 'Saved' as const,
    url: '',
    notes: ''
  });

  const handleAddJob = () => {
    if (!newJob.company || !newJob.title) return;
    const created: JobApp = {
      id: 'job-' + Date.now(),
      company: newJob.company,
      title: newJob.title,
      location: newJob.location || 'Remote',
      salary: newJob.salary,
      status: newJob.status,
      appliedDate: new Date().toISOString().split('T')[0],
      matchScore: 80 + Math.floor(Math.random() * 18),
      url: newJob.url,
      notes: newJob.notes
    };
    setJobs([created, ...jobs]);
    setShowAddModal(false);
    setNewJob({ company: '', title: '', location: 'Remote', salary: '', status: 'Saved', url: '', notes: '' });
  };

  const handleDeleteJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobs(jobs.filter(j => j.id !== id));
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeStatus === 'All' || job.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Offer': return '#10b981';
      case 'Interviewing': return '#3b82f6';
      case 'Applied': return '#6366f1';
      case 'Saved': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="container page-wrapper animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ textAlign: 'left', marginBottom: '4px' }}>Job Application Tracker</h1>
          <p className="page-subtitle" style={{ textAlign: 'left' }}>
            Manage saved jobs, interview pipelines, application notes, and tailor scores.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add New Job
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '240px' }}>
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', background: 'transparent', border: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Saved', 'Applied', 'Interviewing', 'Offer'].map(status => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: activeStatus === status ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeStatus === status ? '#818cf8' : 'var(--dark-text-secondary)',
                border: activeStatus === status ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fill, minmax(320px, 1fr) )', gap: '20px' }}>
        {filteredJobs.map(job => (
          <div
            key={job.id}
            className="card"
            style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
            onClick={() => navigate(`/jobs/${job.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    backgroundColor: `${getStatusColor(job.status)}20`,
                    color: getStatusColor(job.status),
                    border: `1px solid ${getStatusColor(job.status)}40`,
                    marginBottom: '8px'
                  }}
                >
                  {job.status}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{job.title}</h3>
                <div style={{ fontSize: '14px', color: 'var(--dark-text-secondary)', fontWeight: '600' }}>{job.company}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{job.matchScore}% Match</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', fontSize: '12.5px', color: 'var(--dark-text-secondary)', marginBottom: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin className="w-3.5 h-3.5" /> {job.location}
              </span>
              {job.salary && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <DollarSign className="w-3.5 h-3.5" /> {job.salary}
                </span>
              )}
            </div>

            {job.notes && (
              <p style={{ fontSize: '13px', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '10px', marginBottom: '16px', lineHeight: '1.4' }}>
                {job.notes}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--dark-border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--dark-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar className="w-3.5 h-3.5" /> {job.appliedDate}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => handleDeleteJob(job.id, e)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.7, padding: '4px' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Track New Job Position</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--dark-text-secondary)' }}>Company Name</label>
                <input type="text" placeholder="e.g. OpenAI" value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--dark-text-secondary)' }}>Job Title</label>
                <input type="text" placeholder="e.g. Frontend Developer" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--dark-text-secondary)' }}>Salary Range</label>
                <input type="text" placeholder="e.g. $140k - $160k" value={newJob.salary} onChange={e => setNewJob({ ...newJob, salary: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--dark-text-secondary)' }}>Status</label>
                <select value={newJob.status} onChange={e => setNewJob({ ...newJob, status: e.target.value as any })}>
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--dark-text-secondary)' }}>Notes</label>
                <textarea rows={3} placeholder="Application details, interviewer names..." value={newJob.notes} onChange={e => setNewJob({ ...newJob, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddJob}>Save Job</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
