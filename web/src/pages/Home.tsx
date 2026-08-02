import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

// Import exact design assets
import webHome from '../assets/web-home.png';
import webHome2 from '../assets/web-home2.png';
import webHome3 from '../assets/web-home3.png';
import webHome4 from '../assets/web-home4.png';
import webHome5 from '../assets/web-home5.png';
import webHome6 from '../assets/web-home6.png';
import webHome7 from '../assets/web-home7.png';
import webHome8 from '../assets/web-home8.png';
import webHome9 from '../assets/web-home9.png';
import webHome10 from '../assets/web-home10.png';
import webHome11 from '../assets/web-home11.png';
import webHome12 from '../assets/web-home12.png';
import webHome13 from '../assets/web-home13.png';
import webHome14 from '../assets/web-home14.png';
import webHome15 from '../assets/web-home15.png';
import webHome16 from '../assets/web-home16.png';
import webHome17 from '../assets/web-home17.png';

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [activeTab2, setActiveTab2] = useState(0);

  useSEO(
    "ResumeOK - Land Interviews 6x Faster",
    "AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you're a genuine fit."
  );

  const tabData = [
    {
      title: "Smart Match",
      desc: "Stop scrolling through hundreds of irrelevant listings. Our AI filters 8M+ jobs down to the ones that actually match your experience, skills, and career trajectory — with zero fake postings or expired links.",
      linkText: "Explore Smart Match",
      path: "/match",
      image: webHome4
    },
    {
      title: "AI Resume Builder",
      desc: "Generate a role-specific resume in seconds. The AI analyzes each job description, highlights your most relevant experience, optimizes for ATS parsing, and formats it professionally — so you stand out in the first 6-second scan.",
      linkText: "Explore AI Resume Builder",
      path: "/build",
      image: webHome6
    },
    {
      title: "Hands-free Auto Apply",
      desc: "Set your preferences once and let AI handle the rest. It applies to matching roles daily, tailoring each submission — saving you 10+ hours a week of repetitive form-filling.",
      linkText: "Explore Auto Apply",
      path: "/jobs",
      image: webHome17
    }
  ];

  const tabData2 = [
    {
      title: "Insider Referrals",
      desc: "Discover alumni, mutual connections, and hiring managers at your target companies. Get warm introductions that increase your interview chances by 4x — no cold outreach required.",
      linkText: "Build connections",
      path: "/tasks",
      image: webHome4
    },
    {
      title: "Interview Intelligence",
      desc: "Get company-specific interview questions, salary benchmarks, and hiring timeline insights pulled from real candidate data — so you walk in prepared, not guessing.",
      linkText: "Prep smarter",
      path: "/audit",
      image: webHome13
    },
    {
      title: "Application Tracker",
      desc: "See every application in one dashboard — status updates, response rates, follow-up reminders, and insights on which strategies are landing you interviews. No more spreadsheet chaos.",
      linkText: "Track applications",
      path: "/jobs",
      image: webHome17
    }
  ];

  return (
    <div className="resumeok-landing">
      {/* 1. Hero Section */}
      <section className="resumeok-hero-section">
        <div className="resumeok-hero-grid">
          {/* Left Title Column */}
          <div className="resumeok-hero-left">
            <h1 className="resumeok-hero-headline">
              Land interviews 6x fasterr..<br />
              Zero guesswork.
            </h1>
          </div>

          {/* Right Subtitle & CTA Column */}
          <div className="resumeok-hero-right">
            <p className="resumeok-hero-desc">
              AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you're a genuine fit.
            </p>
            <button className="resumeok-btn-hero-cta" onClick={() => navigate('/match')}>
              Start applying smarter
            </button>
          </div>
        </div>

        {/* Hero Demo Screenshot Frame Box */}
        <div className="resumeok-hero-banner-container">
          <img src={webHome6} alt="ResumeOK AI Workflow Mockup" className="resumeok-hero-banner-img" />
        </div>
      </section>

      {/* 2. Verified Jobs Logos Ticker Section */}
      <section className="resumeok-logos-section">
        <div className="resumeok-logos-header">
          8M+ VERIFIED JOBS. UPDATED EVERY HOUR.
        </div>
        <div className="resumeok-logos-container">
          <img src={webHome9} alt="Top Companies Hiring" className="resumeok-logos-img" />
        </div>
      </section>

      {/* 3. Note From Our CEO Section */}
      <section className="resumeok-ceo-section">
        <div className="resumeok-ceo-col-label">
          <span className="resumeok-ceo-label">Note From Our CEO</span>
        </div>
        <div className="resumeok-ceo-col-quote">
          <p className="resumeok-ceo-quote">
            “With <span className="quote-highlight-orange">Most job boards blast your resume everywhere and call it progress.</span> We built something different — an AI that actually understands what makes you a strong candidate and only puts you forward when there's a real match. Quality applications, not quantity.”
          </p>
          <div className="resumeok-ceo-author">
            <div className="resumeok-ceo-name">Saman Kazempour</div>
            <div className="resumeok-ceo-title">CEO of ResumeOK</div>
          </div>
        </div>
        <div className="resumeok-ceo-col-image">
          <img src={webHome2} alt="Saman Kazempour - CEO of ResumeOK" className="resumeok-ceo-img" />
        </div>
      </section>

      {/* 4. Full Width Cream Banner Section */}
      <section className="resumeok-fullwidth-banner">
        <div className="resumeok-fullwidth-banner-inner">
          <h2 className="resumeok-fullwidth-title">
            No fluff. No fake listings. Just the tools that<br />
            actually get you hired.
          </h2>
          <div className="resumeok-fullwidth-graphic">
            <img src={webHome12} alt="Glass Sphere Graphic" className="resumeok-glass-sphere-img" />
          </div>
        </div>
      </section>

      {/* 5. AI Reads Job Post Feature Section */}
      <section className="resumeok-ai-read-section">
        <div className="resumeok-ai-read-inner">
          {/* Left Column */}
          <div className="resumeok-ai-read-left">
            <div className="resumeok-ai-read-text-box">
              <h2 className="resumeok-ai-read-title">
                AI that actually reads the job post
              </h2>
              <p className="resumeok-ai-read-desc">
                Our AI doesn't just keyword-match — it understands role context, seniority signals, and hidden requirements. You see jobs you're genuinely qualified for, ranked by real fit score, with early alerts before the applicant flood.
              </p>
            </div>
            <div className="resumeok-ai-read-small-card">
              <img src={webHome3} alt="What To Put On Your Resume When You Have No Experience" className="resumeok-ai-read-small-img" />
            </div>
          </div>

          {/* Right Column */}
          <div className="resumeok-ai-read-right">
            <img src={webHome4} alt="AI Job Reading Interface" className="resumeok-ai-read-large-img" />
          </div>
        </div>
      </section>

      {/* 6. Dual Feature Cards Section */}
      <section className="resumeok-dual-features-section">
        <div className="resumeok-dual-features-inner">
          {/* Left Feature Card */}
          <div className="resumeok-feature-box">
            <div className="resumeok-feature-box-media">
              <img src={webHome17} alt="One-click apply AI conversation summary" className="resumeok-feature-box-img" />
            </div>
            <div className="resumeok-feature-box-content">
              <h3 className="resumeok-feature-box-title">
                One-click apply that doesn't cut corners
              </h3>
              <p className="resumeok-feature-box-desc">
                Auto-fill applications across every major job board and ATS. But unlike bulk-spray tools, each submission is tailored — your resume, cover letter, and answers adapted to what that specific role actually asks for.
              </p>
              <button className="resumeok-btn-feature-box" onClick={() => navigate('/jobs')}>
                Find your dream job
              </button>
            </div>
          </div>

          {/* Right Feature Card */}
          <div className="resumeok-feature-box">
            <div className="resumeok-feature-box-media">
              <img src={webHome13} alt="Topics Explorer ATS Resume Scoring" className="resumeok-feature-box-img" />
            </div>
            <div className="resumeok-feature-box-content">
              <h3 className="resumeok-feature-box-title">
                Resume scoring that thinks like a recruiter
              </h3>
              <p className="resumeok-feature-box-desc">
                Get an instant breakdown of how your resume stacks up against each job post. See exactly what's missing, what's strong, and get AI rewrites that close the gap — before you hit apply.
              </p>
              <button className="resumeok-btn-feature-box" onClick={() => navigate('/audit')}>
                Find your dream job
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AI Career Copilot Section */}
      <section className="resumeok-copilot-section">
        {/* Left Column (Centered Content) */}
        <div className="resumeok-copilot-left">
          <span className="resumeok-copilot-tag">AI CAREER COPILOT</span>
          <h2 className="resumeok-copilot-title">
            Your personal<br />
            hiring strategist
          </h2>
          <div className="resumeok-copilot-orb-box">
            <img src={webHome11} alt="AI Sphere Orb" className="resumeok-copilot-orb-img" />
          </div>
          <p className="resumeok-copilot-desc">
            More than a chatbot — a career copilot that tracks your applications, preps you for interviews, and learns your strengths, goals and preferences over time Available 24/7 — like having a recruiter in your pocket.
          </p>
          <button className="resumeok-btn-copilot" onClick={() => navigate('/match')}>
            Meet your copilot
          </button>
        </div>

        {/* Right Column (Sharp Art Image) */}
        <div className="resumeok-copilot-right">
          <img src={webHome} alt="AI Career Copilot Illustration" className="resumeok-copilot-art-img" />
        </div>
      </section>

      {/* 8. Complete Toolkit Header Section */}
      <section className="resumeok-toolkit-section">
        {/* Left Content */}
        <div className="resumeok-toolkit-left">
          <h2 className="resumeok-toolkit-title">
            <span className="resumeok-toolkit-title-light">A complete toolkit</span><br />
            <span className="resumeok-toolkit-title-dark">for modern job seekers</span>
          </h2>
          <p className="resumeok-toolkit-desc">
            Everything you need in one place — from smart job discovery and AI resume building to application tracking, interview prep, and insider referrals. No switching between ten different tools.
          </p>
          <div className="resumeok-toolkit-buttons">
            <button className="btn-resumeok-black" onClick={() => navigate('/match')}>
              Get started free
            </button>
            <button className="btn-resumeok-outline" onClick={() => navigate('/jobs')}>
              See it in action
            </button>
          </div>
        </div>

        {/* Right Flying Birds Graphic */}
        <div className="resumeok-toolkit-right">
          <img src={webHome7} alt="Flying Birds Illustration" className="resumeok-toolkit-birds-img" />
        </div>
      </section>

      {/* 9. Interactive 3-Tab Feature Section 1 */}
      <section className="resumeok-tabs-section">
        <h2 className="resumeok-tabs-section-title">Find roles worth applying to</h2>

        <div className="resumeok-tabs-grid">
          {/* Left Column: Sharp Image directly adjacent */}
          <div className="resumeok-tabs-media">
            <img 
              src={tabData[activeTab].image} 
              alt={tabData[activeTab].title} 
              className="resumeok-tabs-img" 
            />
          </div>

          {/* Right Column: 3 Interactive Tabs */}
          <div className="resumeok-tabs-list">
            {tabData.map((tab, idx) => {
              const isActive = activeTab === idx;
              return (
                <div 
                  key={idx} 
                  className={`resumeok-tab-item ${isActive ? 'resumeok-tab-active' : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  <div className="resumeok-tab-header">
                    <span className="resumeok-tab-blue-square">■</span>
                    <h3 className="resumeok-tab-title">{tab.title}</h3>
                  </div>
                  <p className="resumeok-tab-desc">{tab.desc}</p>
                  {isActive && (
                    <button 
                      className="resumeok-tab-link-btn" 
                      onClick={(e) => { e.stopPropagation(); navigate(tab.path); }}
                    >
                      {tab.linkText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. Interactive 3-Tab Feature Section 2 (Get Inside Access) */}
      <section className="resumeok-tabs-section">
        <h2 className="resumeok-toolkit-title" style={{ marginBottom: '36px' }}>
          <span className="resumeok-toolkit-title-dark">Get inside access</span><br />
          <span className="resumeok-toolkit-title-light">to the companies you want</span>
        </h2>

        <div className="resumeok-tabs-grid">
          {/* Left Column: Sharp Image directly adjacent */}
          <div className="resumeok-tabs-media">
            <img 
              src={tabData2[activeTab2].image} 
              alt={tabData2[activeTab2].title} 
              className="resumeok-tabs-img" 
            />
          </div>

          {/* Right Column: 3 Interactive Tabs */}
          <div className="resumeok-tabs-list">
            {tabData2.map((tab, idx) => {
              const isActive = activeTab2 === idx;
              return (
                <div 
                  key={idx} 
                  className={`resumeok-tab-item ${isActive ? 'resumeok-tab-active' : ''}`}
                  onClick={() => setActiveTab2(idx)}
                >
                  <div className="resumeok-tab-header">
                    <span className="resumeok-tab-blue-square">■</span>
                    <h3 className="resumeok-tab-title">{tab.title}</h3>
                  </div>
                  <p className="resumeok-tab-desc">{tab.desc}</p>
                  {isActive && (
                    <button 
                      className="resumeok-tab-link-btn" 
                      onClick={(e) => { e.stopPropagation(); navigate(tab.path); }}
                    >
                      {tab.linkText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. Testimonial Banner 2 (3 Columns, Warm Sand Container, Sharp Corners, Not Full Width) */}
      <section className="resumeok-clay-testimonial-section">
        {/* Column 1: Clay Logo */}
        <div className="resumeok-clay-col-logo">
          <img src={webHome10} alt="Clay Logo" className="resumeok-clay-logo-img" />
        </div>

        {/* Column 2: Quote & Author */}
        <div className="resumeok-clay-col-quote">
          <p className="resumeok-clay-quote-text">
            “ I went from mass-applying to 50 jobs a week with zero callbacks, to landing 3 interviews in my first week using ResumeOK. The AI actually matched me to roles I was qualified for — game changer.”
          </p>
          <div className="resumeok-clay-author">
            <div className="resumeok-clay-author-name">Marcus Chen</div>
            <div className="resumeok-clay-author-title">Senior Product Designer</div>
          </div>
        </div>

        {/* Column 3: Marcus Chen Portrait Photo */}
        <div className="resumeok-clay-col-photo">
          <img src={webHome5} alt="Marcus Chen - Senior Product Designer" className="resumeok-clay-photo-img" />
        </div>
      </section>

      {/* 12. Honest Pricing Section */}
      <section className="resumeok-pricing-container-section">
        <div className="resumeok-pricing-pattern-bg" style={{ backgroundImage: `url(${webHome8})` }}>
          <h2 className="resumeok-pricing-main-title">Simple, honest pricing</h2>

          {/* Centered Solid Cream Card (No Border Radius) */}
          <div className="resumeok-pricing-solid-box">
            <h3 className="resumeok-pricing-box-title">Pro Job Seeker</h3>
            <p className="resumeok-pricing-box-desc">
              Combine smart matching with Pro for unlimited AI applications, resume tailoring, and referral access.
            </p>
            <div className="resumeok-pricing-amount">$19</div>
            <div className="resumeok-pricing-period">PER SEAT/MO</div>
            <button className="resumeok-btn-pricing-box" onClick={() => navigate('/pricing')}>
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* 13. Blog Articles Cards */}
      <section className="resumeok-partner-section">
        <div className="resumeok-partner-grid">
          {/* Card 1 */}
          <div 
            className="resumeok-partner-box resumeok-blog-card-link"
            onClick={() => navigate('/library')}
            role="button"
            tabIndex={0}
          >
            <div className="resumeok-partner-box-media">
              <img src={webHome14} alt="Your data stays yours" className="resumeok-partner-box-img" />
            </div>
            <div className="resumeok-partner-box-content">
              <h3 className="resumeok-partner-box-title">
                Your data stays yours <span className="blog-link-arrow">→</span>
              </h3>
              <p className="resumeok-partner-box-desc">
                Enterprise-grade encryption. We never sell your data or share your resume with third parties.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div 
            className="resumeok-partner-box resumeok-blog-card-link"
            onClick={() => navigate('/library')}
            role="button"
            tabIndex={0}
          >
            <div className="resumeok-partner-box-media">
              <img src={webHome15} alt="Real humans, real help" className="resumeok-partner-box-img" />
            </div>
            <div className="resumeok-partner-box-content">
              <h3 className="resumeok-partner-box-title">
                Real humans, real help <span className="blog-link-arrow">→</span>
              </h3>
              <p className="resumeok-partner-box-desc">
                Our career experts and AI engineers are available 24/7. When algorithm guidance isn't enough, get personalized support from real recruiters who want you to win.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div 
            className="resumeok-partner-box resumeok-blog-card-link"
            onClick={() => navigate('/library')}
            role="button"
            tabIndex={0}
          >
            <div className="resumeok-partner-box-media">
              <img src={webHome16} alt="The Job Search Playbook" className="resumeok-partner-box-img" />
            </div>
            <div className="resumeok-partner-box-content">
              <h3 className="resumeok-partner-box-title">
                The Job Search Playbook <span className="blog-link-arrow">→</span>
              </h3>
              <p className="resumeok-partner-box-desc">
                Get battle-tested strategies, interview frameworks, and salary negotiation scripts derived from analyzing over 100,000 successful hires.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
