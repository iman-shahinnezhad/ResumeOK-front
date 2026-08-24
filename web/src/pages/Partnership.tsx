import React, { useState } from 'react';
import { Sparkles, ArrowRight, Zap, X, Send, Award, DollarSign, TrendingUp, Gift, Percent } from 'lucide-react';
import './Partnership.css';

// Google Sheets API / Webhook URL
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzDh-EgPQbKkaYxACWhfN8PVW1rvP2bXpWVfetMXlYyFtZ85fOe5uQH3kBihEjLgW4/exec';

export default function Partnership() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    platform: 'Instagram',
    socialUrl: '',
    followers: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      timestamp: new Date().toLocaleString(),
      name: formData.name,
      email: formData.email,
      platform: formData.platform,
      socialUrl: formData.socialUrl,
      followers: formData.followers,
      message: formData.message
    };

    // 1. Send data to Google Sheets API if URL is configured
    if (GOOGLE_SHEETS_API_URL) {
      try {
        await fetch(GOOGLE_SHEETS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          mode: 'no-cors' // Allows posting to Google Apps Script Web Apps seamlessly
        });
      } catch (err) {
        console.error('Error submitting to Google Sheets API:', err);
      }
    }

    // 2. Backup in localStorage for safety
    try {
      const existing = JSON.parse(localStorage.getItem('resumeok_ambassador_applications') || '[]');
      existing.push(payload);
      localStorage.setItem('resumeok_ambassador_applications', JSON.stringify(existing));
    } catch (err) {
      console.error('LocalStorage backup error:', err);
    }

    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        platform: 'Instagram',
        socialUrl: '',
        followers: '',
        message: ''
      });
    }, 4000);
  };

  return (
    <div className="partnership-container">
      {/* Background Decorator Gradients (Light Mode) */}
      <div className="partnership-bg-glow glow-top" />
      <div className="partnership-bg-glow glow-middle" />

      <div className="container partnership-wrapper">
        {/* Header Section */}
        <header className="partnership-header text-center">
          <div className="partnership-badge">
            <Sparkles className="w-4 h-4 text-emerald-600 inline-block mr-1.5" />
            <span>ResumeOK Ambassador Network</span>
          </div>

          <h1 className="partnership-title">
            Be Our Partner While Bringing Your Visions To Life
          </h1>

          <p className="partnership-subtitle">
            Empower job seekers worldwide with AI-driven career tools. Join our exclusive App Ambassador Network to earn recurring commission, get free premium access, and grow together.
          </p>
        </header>

        {/* 1. Featured Card: App Ambassador */}
        <section className="featured-partner-card">
          <div className="featured-card-header">
            <div className="featured-tag">FEATURED PROGRAM</div>
            <h2 className="featured-card-title">App Ambassador</h2>
            <p className="featured-card-desc">
              Designed for passionate creators, reviewers, and career experts looking to monetize their content and audience.
            </p>
          </div>

          <div className="featured-benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="benefit-content">
                <strong>Earn 30% recurring on every sale</strong>
                <span>Receive 30% recurring revenue share for every user who signs up through your link.</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="benefit-content">
                <strong>Earn as long as they stay subscribed.</strong>
                <span>Build true passive income every single month your referred users remain active.</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <Gift className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="benefit-content">
                <strong>Premium access to the service, free for you.</strong>
                <span>Enjoy full, unlimited access to all ResumeOK AI tools, builders, and templates at zero cost.</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <Percent className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="benefit-content">
                <strong>15% off for your audience from you</strong>
                <span>Offer your audience an exclusive promo code for 15% discount on all plans.</span>
              </div>
            </div>
          </div>

          <div className="featured-card-action">
            <button className="btn-partner-primary" onClick={() => setIsModalOpen(true)}>
              <span>Become App Ambassador</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </section>

        {/* 2. Section: What You'll Do */}
        <section className="partnership-grid-section">
          <div className="partnership-info-card full-width-card">
            <div className="card-sidebar">
              <div className="card-sidebar-icon">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="card-sidebar-title">What You'll Do</h3>
            </div>

            <div className="card-content-body">
              <ul className="partnership-checklist">
                <li>
                  <span className="bullet-dot" />
                  <p>Create creative posts how you think its going to work for your audience to introduce ResumeOK.</p>
                </li>
                <li>
                  <span className="bullet-dot" />
                  <p>We'd love to hear your thoughts and feedback directly to help improve our app!</p>
                </li>
                <li>
                  <span className="bullet-dot" />
                  <p>Highlight the latest features and updates of ResumeOK in your posts and videos.</p>
                </li>
                <li>
                  <span className="bullet-dot" />
                  <p>Revise your bio to include <em>"App Ambassador @ ResumeOK"</em> on your social media profiles.</p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Section: Who We Are & Metrics (Clean white background, no boxes) */}
        <section className="who-we-are-clean-section text-center">
          <h2 className="who-we-are-title">Who We Are</h2>
          <p className="who-we-are-desc">
            With 15 Years Of Experience, Pixflow Has Proven It's Potential To Disrupt The Market With Positive Outcome. NextFrame AI Is Our Next Step Toward A Bright AI Future.
          </p>

          <div className="stats-clean-row">
            <div className="stat-clean-item">
              <div className="stat-number">+15</div>
              <div className="stat-label">Years Of<br />Experience</div>
            </div>

            <div className="stat-clean-item">
              <div className="stat-number">200K</div>
              <div className="stat-label">Loyal<br />Customers</div>
            </div>

            <div className="stat-clean-item">
              <div className="stat-number">+4M</div>
              <div className="stat-label">Happy Users<br />Worldwide</div>
            </div>
          </div>

          <div className="who-we-are-cta">
            <button className="btn-partner-pill" onClick={() => setIsModalOpen(true)}>
              Become App Ambassador
            </button>
          </div>
        </section>
      </div>

      {/* Application Modal */}
      {isModalOpen && (
        <div className="partner-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="partner-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <X className="w-5 h-5 text-slate-500" />
            </button>

            {submitted ? (
              <div className="modal-success-state text-center">
                <div className="success-icon-badge">
                  <Award className="w-10 h-10 text-emerald-600" />
                </div>
                <h3>Application Saved & Submitted!</h3>
                <p>
                  Thank you for applying to the ResumeOK App Ambassador Program. Your application details have been saved, and our team will review your profile within 48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="partner-form">
                <div className="form-header">
                  <h3>Apply for App Ambassador</h3>
                  <p>Fill out your details to join our ambassador program.</p>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Main Platform</label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Instagram">Instagram</option>
                      <option value="X (Twitter)">X (Twitter)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label>Audience / Followers</label>
                    <input
                      type="text"
                      placeholder="e.g. 25k"
                      value={formData.followers}
                      onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Social Profile / Portfolio Link</label>
                  <input
                    type="url"
                    required
                    placeholder="https://linkedin.com/in/username or channel URL"
                    value={formData.socialUrl}
                    onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>How do you plan to introduce ResumeOK to your audience?</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us briefly about your content ideas and audience..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-partner-primary full-w" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
