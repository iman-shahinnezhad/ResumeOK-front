import { useState } from 'react';
import { Gift, CheckCircle, Share2, UserPlus, Star, Award } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Tasks() {
  useSEO(
    "Daily Rewards & AI Credits - ResumeOK",
    "Complete quick daily tasks to earn free AI scanning and auto-apply credits."
  );

  const [claimed, setClaimed] = useState<{ [key: string]: boolean }>({});

  const tasks = [
    { id: 't1', title: 'Daily Check-in', reward: '+10 Credits', desc: 'Log in daily to claim free credits for resume scanning.', icon: Gift },
    { id: 't2', title: 'Complete Candidate Profile', reward: '+25 Credits', desc: 'Fill out target roles, location preferences, and skills.', icon: UserPlus },
    { id: 't3', title: 'Upload Active Resume', reward: '+20 Credits', desc: 'Upload your latest PDF resume to run Smart Match.', icon: Star },
    { id: 't4', title: 'Invite a Colleague / Friend', reward: '+50 Credits', desc: 'Share your referral link with job seeking colleagues.', icon: Share2 }
  ];

  const handleClaim = (id: string) => {
    setClaimed({ ...claimed, [id]: true });
  };

  return (
    <div className="resumeok-page-container">
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <Award className="w-3.5 h-3.5" /> DAILY CANDIDATE REWARDS
        </span>
        <h1 className="resumeok-page-title">Earn Free AI Credits</h1>
        <p className="resumeok-page-subtitle">
          Complete simple daily candidate tasks to claim extra credits for resume auditing and auto-apply.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {tasks.map(task => {
          const IconComponent = task.icon;
          const isDone = claimed[task.id];
          return (
            <div key={task.id} className="resumeok-card-cream" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <IconComponent className="w-6 h-6 text-gray-800" />
                  <span className="resumeok-badge resumeok-badge-green">{task.reward}</span>
                </div>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#141414', marginBottom: '8px' }}>
                  {task.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#555555', lineHeight: '1.5', marginBottom: '20px' }}>
                  {task.desc}
                </p>
              </div>

              <button
                className={isDone ? "btn-resumeok-outline" : "btn-resumeok-black"}
                onClick={() => handleClaim(task.id)}
                disabled={isDone}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isDone ? <><CheckCircle className="w-4 h-4 mr-1 text-green-600 inline-block" /> Claimed</> : 'Claim Reward'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
