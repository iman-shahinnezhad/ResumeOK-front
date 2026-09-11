import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

// Import exact design assets
import webHome2 from '../assets/web-home2.png';
import webHome8 from '../assets/web-home8.png';
import webHome9 from '../assets/web-home9.png';
import web1 from '../assets/web1.jpg';
import web2 from '../assets/web2.png';
import web3 from '../assets/web3.png';
import web4 from '../assets/web4.png';
import web5 from '../assets/web5.png';
import web6 from '../assets/web6.png';
import web7 from '../assets/web7.png';
import web8 from '../assets/web8.png';
import web9 from '../assets/web9.png';

export default function Home() {
  const navigate = useNavigate();
  const [calcHours, setCalcHours] = useState(3);

  useSEO(
    "ApplyDesk - Land Interviews 8x Faster",
    "AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you're a genuine fit."
  );

  return (
    <div className="resumeok-landing">
      {/* 1. Hero Section */}
      <section className="resumeok-hero-section">
        <div className="resumeok-hero-grid">
          {/* Left Title Column */}
          <div className="resumeok-hero-left">
            <h1 className="resumeok-hero-headline">
              Land interviews 8x faster.<br />
              Old applying is dead.
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
          <img src={web1} alt="ResumeOK AI Resume Analysis" className="resumeok-hero-banner-img" />
        </div>
      </section>

      {/* 2. Verified Jobs Logos Ticker Section */}
      <section className="resumeok-logos-section">
        <div className="resumeok-logos-header">
          Small startups to large corporate jobs.
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
          <img src={webHome2} alt="Saman Kazempour - CEO of ApplyDesk" className="resumeok-ceo-img" />
        </div>
      </section>

      {/* 4. Full Width Cream Banner Section */}
      <section className="resumeok-fullwidth-banner">
        <div className="resumeok-fullwidth-banner-inner">
          <h2 className="resumeok-fullwidth-title">
            8,000,000+ Job. No fluff. No fake listings.<br />
            Just the tools that actually get you hired.
          </h2>
          <div className="resumeok-fullwidth-graphic">
            <img src={web2} alt="ResumeOK Tools Folder Graphic" className="resumeok-glass-sphere-img" />
          </div>
        </div>
      </section>

      {/* 5. Personalized AI Job Matches Section */}
      <section className="resumeok-ai-read-section">
        <div className="resumeok-ai-read-inner">
          {/* Left Column */}
          <div className="resumeok-ai-read-left">
            <div className="resumeok-ai-read-text-box">
              <h2 className="resumeok-ai-read-title">
                Personalized AI Job Matches
              </h2>
              <p className="resumeok-ai-read-desc">
                See jobs you're truly qualified for, matched to your real skills, with no fake listings and early alerts.
              </p>
            </div>
            <div className="resumeok-ai-read-small-card">
              <img src={web4} alt="Sticky Note Card" className="resumeok-ai-read-small-img" />
            </div>
          </div>

          {/* Right Column */}
          <div className="resumeok-ai-read-right">
            <img src={web3} alt="Personalized AI Job Matches Mockup" className="resumeok-ai-read-large-img" />
          </div>
        </div>
      </section>

      {/* 5.5 Interactive Calculator Section */}
      <section className="resumeok-calc-section">
        <div className="resumeok-calc-inner">
          <div className="resumeok-calc-header">
            <h2 className="resumeok-calc-headline">
              Auto-filling the fields put you forward others.
            </h2>
            <p className="resumeok-calc-subheadline">
              A 8x monthly lift applying more than regular appying.
            </p>
          </div>

          <div className="resumeok-calc-card">
            {/* Left Box: Controls & Slider */}
            <div className="resumeok-calc-card-left">
              <div>
                <h3 className="resumeok-calc-title">Calculate Applying</h3>
                <p className="resumeok-calc-subtitle">
                  Select the number of hours you spend applying each day.
                </p>

                {/* Slider */}
                <div className="resumeok-calc-slider-box">
                  <div className="resumeok-calc-slider-track">
                    <div
                      className="resumeok-calc-slider-fill"
                      style={{ width: `${((calcHours - 1) / 7) * 100}%` }}
                    />
                    <div
                      className="resumeok-calc-slider-handle"
                      style={{ left: `${((calcHours - 1) / 7) * 100}%` }}
                    />
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={calcHours}
                      onChange={(e) => setCalcHours(Number(e.target.value))}
                      className="resumeok-calc-range-input"
                    />
                  </div>
                  <div className="resumeok-calc-ticks">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                      <div
                        key={h}
                        className={`resumeok-calc-tick ${calcHours === h ? 'active' : ''}`}
                        onClick={() => setCalcHours(h)}
                      >
                        <div className="resumeok-calc-tick-line" />
                        <span>{h} HOUR</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature Bullet Points */}
              <div className="resumeok-calc-features">
                <div className="resumeok-calc-feature-item">+ Tailored resume for each job</div>
                <div className="resumeok-calc-feature-item">+ Personalized cover letter for each role</div>
                <div className="resumeok-calc-feature-item">+ Completing application forms</div>
              </div>
            </div>

            {/* Vertical Divider Line */}
            <div className="resumeok-calc-divider" />

            {/* Right Box: Output Stats */}
            <div className="resumeok-calc-card-right">
              <div className="resumeok-calc-right-header">
                Total application sent<br />in 30 days
              </div>

              <div className="resumeok-calc-stat-group top">
                <div className="resumeok-calc-stat-label orange">ResumeOK</div>
                <div className="resumeok-calc-stat-num orange">
                  {(calcHours * 320).toLocaleString()}
                </div>
              </div>

              <div className="resumeok-calc-stat-group bottom">
                <div className="resumeok-calc-stat-label dark">NORMAL APPLYING</div>
                <div className="resumeok-calc-stat-num dark">
                  {(calcHours * 40).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Dual Feature Cards Section */}
      <section className="resumeok-dual-features-section">
        <div className="resumeok-dual-features-inner">
          {/* Left Feature Card */}
          <div className="resumeok-feature-box">
            <div className="resumeok-feature-box-media">
              <img src={web5} alt="Job Specific Tailored Resume" className="resumeok-feature-box-img" />
            </div>
            <div className="resumeok-feature-box-content">
              <h3 className="resumeok-feature-box-title">
                Job Specific Tailored Resume
              </h3>
              <p className="resumeok-feature-box-desc">
                Get a perfectly tailored, professional resume that passes ATS and highlights your strengths in just 6 seconds.
              </p>
              <button className="resumeok-btn-feature-box" onClick={() => navigate('/build')}>
                Find your dream job
              </button>
            </div>
          </div>

          {/* Right Feature Card */}
          <div className="resumeok-feature-box">
            <div className="resumeok-feature-box-media">
              <img src={web6} alt="1-Click Application Autofill" className="resumeok-feature-box-img" />
            </div>
            <div className="resumeok-feature-box-content">
              <h3 className="resumeok-feature-box-title">
                1-Click Application Autofill
              </h3>
              <p className="resumeok-feature-box-desc">
                Apply to hundreds of jobs daily across all major ATS platforms. Skip repetitive data entry and save 80% of your time.
              </p>
              <button className="resumeok-btn-feature-box" onClick={() => navigate('/jobs')}>
                Find your dream job
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6.5 Jobs Database & Stats Section */}
      <section className="resumeok-db-section">
        <div className="resumeok-db-inner">
          <h2 className="resumeok-db-headline">
            Never out of jobs. 4 Million job in one place.
          </h2>

          {/* Diagram Container */}
          <div className="resumeok-db-diagram">
            {/* Left Image Graphic (web7.png) */}
            <div className="resumeok-db-left-box">
              <img src={web7} alt="Job Roles" className="resumeok-db-side-img" />
            </div>

            {/* Center Orange Box */}
            <div className="resumeok-db-center-box">
              <h3 className="resumeok-db-center-logo">ResumeOK</h3>
              <div className="resumeok-db-center-text">
                <p>Gathering 20K jobs every day</p>
                <p>Finding the right profiles and jobs</p>
                <p>Tailoring 12K Resumes Daily</p>
              </div>
            </div>

            {/* Right Image Graphic (web8.png) */}
            <div className="resumeok-db-right-box">
              <img src={web8} alt="User Profiles" className="resumeok-db-side-img" />
            </div>
          </div>

          {/* Bottom 3-Column Stats Card */}
          <div className="resumeok-db-stats-card">
            <div className="resumeok-db-stat-item">
              <div className="resumeok-db-stat-number">3 Million</div>
              <div className="resumeok-db-stat-label">Job database</div>
            </div>
            <div className="resumeok-db-stat-divider" />
            <div className="resumeok-db-stat-item">
              <div className="resumeok-db-stat-number">20K</div>
              <div className="resumeok-db-stat-label">Daily Jobs</div>
            </div>
            <div className="resumeok-db-stat-divider" />
            <div className="resumeok-db-stat-item">
              <div className="resumeok-db-stat-number">12K</div>
              <div className="resumeok-db-stat-label">Daily Apply</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6.6 Sticky Notes Testimonials Banner Section */}
      <section className="resumeok-sticky-banner-section">
        <div className="resumeok-sticky-banner-inner">
          <img src={web9} alt="Sticky Notes Testimonials Banner" className="resumeok-sticky-banner-img" />
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

    </div>
  );
}
