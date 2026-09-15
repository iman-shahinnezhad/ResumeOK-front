import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
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
            ApplyDesk Privacy Policy
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Last updated: Jul 5, 2026
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

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '0', marginBottom: '12px' }}>
            1. Introduction
          </h3>
          <p>
            Pixflow (“Company,” “we,” “our,” or “us”) respects your privacy and is committed to protecting it. This Privacy Policy describes the types of information we may collect from you or that you may provide when you use the <strong>ApplyDesk</strong> mobile application and web platform (the “App”) and our practices for collecting, using, maintaining, protecting, and disclosing that information.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            2. Scope of this Policy
          </h3>
          <p>This Privacy Policy applies to information we collect:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Through the ApplyDesk application (iOS, Android, and Web)</li>
            <li>Through email and other electronic communications between you and Pixflow</li>
            <li>When you interact with our content, advertisements, analytics, or support services</li>
          </ul>

          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            margin: '24px 0'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: '12px' }}>
              AI Data and Resume Processing
            </h4>
            <p style={{ margin: '0 0 12px 0' }}>
              ApplyDesk uses artificial intelligence technology to provide AI-powered resume optimization, CV tailoring, ATS matching, and professional cover letter generation features.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              To provide these features, users may input or upload text documents containing professional histories, education details, contact information, and skills (“Resume and Profile Data”). Resume and Profile Data is processed only for the purpose of generating the requested AI optimization, formatting, and ATS match results.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              Inputted resumes, profile data, and cover letter contents are securely transmitted to our third-party AI processing providers, including the Google Gemini API infrastructure.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              ApplyDesk does not permanently store, retain, sell, or use your uploaded documents, resumes, or profile data for advertising, external marketing, or AI model training purposes. Any temporary storage of your data is limited to the short period necessary to provide the requested functionality, process your requests, and maintain the operation of the service.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              Resume and profile data are processed securely only to perform the requested optimization tasks. Your data is stored securely in your profile for your personal access, with clear options for users to delete their account data and documents at any time.
            </p>
            <p style={{ margin: 0 }}>
              Third-party AI infrastructure providers process this data only to perform the requested AI matching and generation services, adhering strictly to applicable privacy, data security, and confidentiality requirements.
            </p>
          </div>

          <p>This policy does not apply to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Information collected offline or through any other means</li>
            <li>Third-party services, websites, or applications that may link to or from ApplyDesk</li>
          </ul>

          <p>
            By using ApplyDesk, you agree to this Privacy Policy. If you do not agree with the terms of this policy, please do not use the App.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            3. Children Under the Age of 16
          </h3>
          <p>
            ApplyDesk is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe a child has provided personal information to us, please contact us at <a href="mailto:help@pixflow.net" style={{ color: '#2563EB', textDecoration: 'underline' }}>help@pixflow.net</a>, and we will promptly delete the information.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            4. Information We Collect
          </h3>
          <p>We collect limited personal and non-personal information.</p>

          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginTop: '16px', marginBottom: '8px' }}>
            4.1 Information you provide directly
          </h4>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li>Email address (for account registration, authentication, purchases, or customer support)</li>
            <li>Facial images contained within uploaded photos (“Face Data”) used only for AI image processing and generation</li>
          </ul>

          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginTop: '16px', marginBottom: '8px' }}>
            4.2 Information collected automatically
          </h4>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li>Device information</li>
            <li>App usage information and analytics</li>
            <li>Crash reports and diagnostic information</li>
            <li>Cookies or similar technologies where applicable and with consent</li>
          </ul>

          <p>We do not intentionally collect sensitive information such as government identification numbers, physical addresses, or payment card information.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            5. How We Use Your Information
          </h3>
          <p>We use collected information to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Provide and operate ApplyDesk’s services</li>
            <li>Generate AI-powered image transformations and visualizations</li>
            <li>Process user requests and support inquiries</li>
            <li>Improve app performance and user experience</li>
            <li>Monitor usage trends and technical issues</li>
            <li>Protect against fraud, abuse, or unauthorized access</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We may use aggregated and anonymized information for analytics and product improvement purposes.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            6. Cookies and Tracking Technologies
          </h3>
          <p>Where applicable, ApplyDesk may use cookies, analytics technologies, and similar tools to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Understand how users interact with the App</li>
            <li>Improve functionality and performance</li>
            <li>Measure usage trends and engagement</li>
          </ul>
          <p>Users may manage cookie preferences through their device or browser settings where available.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            7. Sharing and Disclosure
          </h3>
          <p>We do not sell, rent, or trade your personal information.</p>
          <p>We may share limited information with:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Analytics providers and infrastructure providers</li>
            <li>Cloud hosting and storage providers</li>
            <li>AI processing service providers that help deliver ApplyDesk’s functionality</li>
            <li>Service providers operating under confidentiality obligations</li>
          </ul>
          <p>We may also disclose information if required by law or when necessary to protect our rights, users, or property.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            8. Data Security
          </h3>
          <p>
            We implement reasonable administrative, technical, and organizational safeguards designed to protect your information against unauthorized access, disclosure, alteration, or destruction. However, no internet-based service can guarantee absolute security.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            9. User Uploaded Images and AI Processing
          </h3>
          <p>When you upload images to ApplyDesk:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Your image may contain facial information that is processed to generate the requested AI output.</li>
            <li>Images and Face Data are used only for generating your requested result.</li>
            <li>Images and Face Data are not stored permanently after generation is completed.</li>
            <li>Images and Face Data are not used to train AI models.</li>
            <li>Images are not sold, shared for advertising purposes, or used for any purpose unrelated to providing ApplyDesk features.</li>
          </ul>
          <p>
            Pixflow does not use uploaded images to train its own AI models unless explicitly disclosed and separately authorized by you.
          </p>
          <p>
            By uploading content, you consent to the secure transfer and processing of your images for the purpose of providing ApplyDesk’s AI-powered features.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            10. International Data Transfers
          </h3>
          <p>
            ApplyDesk is available worldwide. By using the App, you understand that your information may be transferred to and processed in countries outside your country of residence where privacy laws may differ. Where required, we take appropriate safeguards to protect personal information transferred internationally.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            11. User Rights and Choices
          </h3>
          <p>Depending on your location and applicable law, you may have the right to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Restrict or object to certain processing activities</li>
            <li>Withdraw consent where consent is the legal basis for processing</li>
          </ul>
          <p>To exercise your rights, contact us at <a href="mailto:help@pixflow.net" style={{ color: '#2563EB', textDecoration: 'underline' }}>help@pixflow.net</a>.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            12. GDPR Compliance
          </h3>
          <p>
            If you are located in the European Economic Area (EEA), United Kingdom, or other jurisdictions with similar privacy laws, you may have additional rights under applicable regulations, including the General Data Protection Regulation (GDPR).
          </p>
          <p>These rights may include:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li>Right of access</li>
            <li>Right to rectification</li>
            <li>Right to erasure (“right to be forgotten”)</li>
            <li>Right to restrict processing</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>Right to withdraw consent</li>
          </ul>
          <p>We process personal information only where there is a lawful basis, including:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Your consent</li>
            <li>Performance of a contract</li>
            <li>Compliance with legal obligations</li>
            <li>Legitimate business interests</li>
          </ul>
          <p>To exercise GDPR-related rights, contact us at <a href="mailto:help@pixflow.net" style={{ color: '#2563EB', textDecoration: 'underline' }}>help@pixflow.net</a>.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            13. Changes to This Privacy Policy
          </h3>
          <p>
            We may update this Privacy Policy from time to time.
          </p>
          <p>
            Any changes will be posted within the App or on the applicable website and will become effective upon posting. Continued use of ApplyDesk after changes become effective constitutes acceptance of the updated Privacy Policy.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            14. Contact Information
          </h3>
          <p>If you have questions or comments about this Privacy Policy or our privacy practices, contact us at:</p>
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <Mail style={{ width: '20px', height: '20px', color: '#059669', marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>ApplyDesk</p>
              <p style={{ margin: '2px 0 0 0', color: '#64748B' }}>Paris, France</p>
              <p style={{ margin: '4px 0 0 0', color: '#334155' }}>
                For privacy-related questions, requests, or concerns, please contact us at{' '}
                <a href="mailto:help@pixflow.net" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>help@pixflow.net</a>.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
