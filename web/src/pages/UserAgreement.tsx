import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export default function UserAgreement() {
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
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            <FileText style={{ width: '15px', height: '15px' }} />
            <span>Legal Documentation</span>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: '#0F172A',
            marginBottom: '12px'
          }}>
            User Agreement & End User License Agreement
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
            This End User License Agreement (“Agreement”) is a legal agreement between you and ApplyDesk (“we”, “us”, or “our”). It governs your use of the ApplyDesk mobile and web applications and related services, together the “App”.
          </p>

          <p style={{ marginBottom: '28px' }}>
            By installing, accessing, or using the App, you agree to be bound by this Agreement. If you do not agree, do not install, access, or use the App.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            1. License Grant
          </h3>
          <p>
            Subject to your compliance with this Agreement, ApplyDesk grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Download and install the App on devices you own or control, and</li>
            <li>Access and use the App for your personal or internal business use only.</li>
          </ul>
          <p>All rights not expressly granted to you are reserved by ApplyDesk.</p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            2. Account and Eligibility
          </h3>
          <p>To use certain features of the App, you must create an account and provide a valid email address. You agree to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Provide accurate and complete information,</li>
            <li>Keep your login credentials secure,</li>
            <li>Be responsible for all activity under your account.</li>
          </ul>
          <p>
            The App is not intended for children under 16 years of age. By using the App, you confirm that you are at least 16 years old or that you have the consent of a parent or legal guardian where required by law.
          </p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            3. User Generated Content
          </h3>
          <p>
            The App allows you to upload resumes, documents, and application materials, and to generate custom job applications, cover letters, and tailored content, together “User Content”.
          </p>
          <p>
            You retain ownership of your User Content. By submitting User Content through the App, you grant ApplyDesk a worldwide, non-exclusive, royalty-free license to host, store, process, and display that User Content only as necessary to operate, improve, and provide the App to you.
          </p>
          <p>You represent and warrant that:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>You have all rights necessary to submit the User Content and to grant the license above,</li>
            <li>Your User Content does not violate this Agreement or any laws or rights of others.</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            4. Prohibited Uses
          </h3>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Copy, modify, adapt, translate, or create derivative works based on the App, except as allowed by mandatory law,</li>
            <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the App,</li>
            <li>Circumvent or interfere with any security or access control features of the App,</li>
            <li>Use the App for any illegal purpose or in violation of any applicable law or regulation,</li>
            <li>Use the App in a way that could damage, disable, overburden, or impair the App or interfere with the use of the App by others.</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            5. Intellectual Property
          </h3>
          <p>
            The App, including all software, design, graphics, text, and AI algorithms, is owned by or licensed to ApplyDesk and is protected by copyright and other intellectual property laws.
          </p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            6. Subscriptions and Payments
          </h3>
          <p>
            ApplyDesk offers weekly and monthly subscription options. Payments are charged to your iTunes or App Store Account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Subscriptions may be managed by going to your Account Settings after purchase.
          </p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            7. Limitation of Liability
          </h3>
          <p>
            To the fullest extent permitted by law, ApplyDesk and its directors, employees, and agents will not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the App.
          </p>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            8. Contact Us
          </h3>
          <p>If you have questions about this Agreement, contact us at:</p>
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            marginTop: '12px'
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>ApplyDesk Legal Team</p>
            <p style={{ margin: '4px 0 0 0', color: '#64748B' }}>Email: support@applydesk.io</p>
            <p style={{ margin: '4px 0 0 0', color: '#64748B' }}>Website: https://applydesk.io</p>
          </div>
        </div>

      </div>
    </div>
  );
}
