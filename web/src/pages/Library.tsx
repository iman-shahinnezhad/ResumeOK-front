import { useState } from 'react';
import { BookOpen, Search, Star, ArrowRight } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface ResourceArticle {
  id: string;
  category: 'Playbook' | 'Resume Guides' | 'Interview Prep' | 'Salary Negotiation';
  title: string;
  desc: string;
  readTime: string;
  featured?: boolean;
}

export default function Library() {
  useSEO(
    "Career Library & Job Search Playbook - ResumeOK",
    "Battle-tested job search frameworks, ATS resume templates, interview prep questions, and salary negotiation scripts."
  );

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const articles: ResourceArticle[] = [
    {
      id: 'art-1',
      category: 'Playbook',
      title: 'The 2026 Job Search Playbook: Land Interviews 6x Faster',
      desc: 'How to bypass black-hole ATS filters, leverage AI application agents, and get warm employee referrals at top tech companies.',
      readTime: '8 min read',
      featured: true
    },
    {
      id: 'art-2',
      category: 'Resume Guides',
      title: 'What To Put On Your Resume When You Have No Experience',
      desc: 'Transform coursework, personal projects, open-source contributions, and leadership activities into ATS-ready metric bullet points.',
      readTime: '6 min read',
      featured: true
    },
    {
      id: 'art-3',
      category: 'Interview Prep',
      title: 'Top 25 System Design & Behavioral Interview Questions',
      desc: 'Real candidate interview questions and STAR method answer templates derived from analyzing over 100,000 successful offers.',
      readTime: '10 min read',
      featured: true
    },
    {
      id: 'art-4',
      category: 'Salary Negotiation',
      title: 'The Counter-Offer Script That Added $35,000 To Base Salary',
      desc: 'Word-for-word email templates and negotiation strategies for tech, product, and design roles.',
      readTime: '5 min read'
    },
    {
      id: 'art-5',
      category: 'Resume Guides',
      title: 'ATS Resume Cheat Sheet: Formatting Rules That Pass Scanners',
      desc: 'Learn which fonts, margins, section headers, and file types pass Workday, Greenhouse, and Taleo without getting dropped.',
      readTime: '7 min read'
    }
  ];

  const filteredArticles = articles.filter(art => {
    const matchesCat = activeCategory === 'All' || art.category === activeCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          art.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="resumeok-page-container">
      {/* Header */}
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <BookOpen className="w-3.5 h-3.5" /> RESUMEOK CAREER KNOWLEDGE BASE
        </span>
        <h1 className="resumeok-page-title">The Job Search Library</h1>
        <p className="resumeok-page-subtitle">
          Battle-tested frameworks, interview guides, and salary negotiation scripts derived from analyzing over 100,000 successful hires.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="resumeok-card-cream" style={{ padding: '20px 24px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '260px' }}>
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              className="resumeok-input"
              placeholder="Search guides, interview frameworks, or scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: '1px solid #e3dfd5' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Playbook', 'Resume Guides', 'Interview Prep', 'Salary Negotiation'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '700',
                  backgroundColor: activeCategory === cat ? '#141414' : '#ffffff',
                  color: activeCategory === cat ? '#ffffff' : '#444444',
                  border: activeCategory === cat ? '1px solid #141414' : '1px solid #e0ded7',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
        {filteredArticles.map(art => (
          <div
            key={art.id}
            className="resumeok-card-white"
            style={{
              padding: '32px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="resumeok-badge resumeok-badge-amber">{art.category}</span>
                <span style={{ fontSize: '12px', color: '#777777', fontWeight: '600' }}>{art.readTime}</span>
              </div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#141414', lineHeight: '1.25', marginBottom: '12px' }}>
                {art.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#555555', lineHeight: '1.6', marginBottom: '24px' }}>
                {art.desc}
              </p>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid #ece9e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Read Guide <ArrowRight className="w-4 h-4 ml-1 inline-block" />
              </span>
              {art.featured && (
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Star className="w-3.5 h-3.5 fill-current" /> Featured
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
