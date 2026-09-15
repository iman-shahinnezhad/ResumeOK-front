import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      color: '#0F172A',
      paddingTop: '40px',
      paddingBottom: '80px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div className="container" style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Top Navigation / Breadcrumb */}
        <div style={{ marginBottom: '24px' }}>
          <Link to="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748B',
            textDecoration: 'none',
            transition: 'color 0.2s ease'
          }}>
            <ArrowLeft style={{ width: '16px', height: '16px' }} /> Back to Home
          </Link>
        </div>

        {/* Page Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '36px 40px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
          marginBottom: '28px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            <ShieldCheck style={{ width: '15px', height: '15px' }} />
            <span>Privacy & Data Security</span>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: '#0F172A',
            marginBottom: '12px'
          }}>
            Privacy Policy
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Last updated: November 17, 2025
          </p>
        </div>

        {/* Content Body */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '40px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
          lineHeight: '1.7',
          fontSize: '15px',
          color: '#334155'
        }}>
          <p style={{ marginTop: 0, marginBottom: '20px' }}>
            At ApplyDesk, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit or use our mobile application and web platform at <strong>https://applydesk.io</strong>.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            1. Information We Collect
          </h3>
          <p>We may collect personal information that you voluntarily provide to us when using ApplyDesk:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li><strong>Account Data:</strong> Email address, name, Apple ID credentials when signing in via Apple Auth.</li>
            <li><strong>Career & Resume Data:</strong> Work history, skills, education, target job titles, uploaded PDF resumes, and customized cover letters.</li>
            <li><strong>Usage Data:</strong> Device model, operating system, app interactions, and crash diagnostics to ensure system stability.</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            2. How We Use Your Information
          </h3>
          <p>We use the information we collect strictly to deliver, optimize, and secure our AI career services:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>To match your resume against live job listings and compute match compatibility scores.</li>
            <li>To generate tailored resumes and cover letters using secure AI models.</li>
            <li>To manage subscription credits and process in-app transactions securely through Apple App Store.</li>
            <li>To provide customer support and troubleshoot technical issues.</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            3. Data Protection & 100% Confidentiality
          </h3>
          <p>
            Your uploaded documents and personal career data are <strong>100% private and confidential</strong>. We do not sell your personal data or resume information to recruiters, advertisers, or third-party data brokers.
          </p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            4. Data Retention & Deletion
          </h3>
          <p>
            You have full control over your data. You can delete your saved resumes, cover letters, and account profile at any time directly in the App settings or by sending a request to support@applydesk.io. Upon request, all associated user records are permanently purged from our primary database.
          </p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            5. Contact Us
          </h3>
          <p>If you have any questions or concerns regarding this Privacy Policy, please reach out to us:</p>
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            marginTop: '12px'
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>ApplyDesk Privacy Team</p>
            <p style={{ margin: '4px 0 0 0', color: '#64748B' }}>Email: support@applydesk.io</p>
            <p style={{ margin: '4px 0 0 0', color: '#64748B' }}>Website: https://applydesk.io</p>
          </div>
        </div>

      </div>
    </div>
  );
}
