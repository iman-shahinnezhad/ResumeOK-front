import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Mail } from 'lucide-react';

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
            <span>Legal Agreement</span>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: '#0F172A',
            marginBottom: '12px'
          }}>
            Pixflow App End User License Agreement
          </h1>

          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Last updated: 17 November 2025
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
            This End User License Agreement, “Agreement”, is a legal agreement between you and Pixflow, “Pixflow”, “we”, “us”, or “our”. It governs your use of the Pixflow mobile and web applications and related services, together the “App”.
          </p>
          <p style={{ marginBottom: '20px' }}>
            By installing, accessing, or using the App, you agree to be bound by this Agreement. If you do not agree, do not install, access, or use the App.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            1. License Grant
          </h3>
          <p>
            Subject to your compliance with this Agreement, Pixflow grants you a limited, non exclusive, non transferable, non sublicensable, revocable license to:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>download and install the App on devices you own or control, and</li>
            <li>access and use the App for your personal or internal business use only.</li>
          </ul>
          <p>All rights not expressly granted to you are reserved by Pixflow.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            2. Account and Eligibility
          </h3>
          <p>To use certain features of the App, you must create an account and provide a valid email address. You agree to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>provide accurate and complete information,</li>
            <li>keep your login credentials secure,</li>
            <li>be responsible for all activity under your account.</li>
          </ul>
          <p>
            The App is not intended for children under 16 years of age. By using the App, you confirm that you are at least 16 years old or that you have the consent of a parent or legal guardian where required by law.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            3. User Generated Content
          </h3>
          <p>
            The App allows you to upload or capture photos and apply color, overlay, and premade effects, and to create other content, together “User Content”.
          </p>
          <p>
            You retain ownership of your User Content. By submitting User Content through the App, you grant Pixflow a worldwide, non exclusive, royalty free license to host, store, process, and display that User Content only as necessary to operate, improve, and provide the App to you and, where applicable, to other users.
          </p>
          <p>You represent and warrant that:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>you have all rights necessary to submit the User Content and to grant the license above,</li>
            <li>your User Content does not violate this Agreement or any laws or rights of others.</li>
          </ul>
          <p>
            Pixflow is not obligated to monitor User Content, but we may remove or disable access to any User Content that we consider to be in violation of this Agreement or harmful to the App or others.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            4. Prohibited Uses
          </h3>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>copy, modify, adapt, translate, or create derivative works based on the App, except as allowed by mandatory law,</li>
            <li>reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the App, except where such restrictions are prohibited by law,</li>
            <li>circumvent or interfere with any security or access control features of the App,</li>
            <li>use the App for any illegal purpose or in violation of any applicable law or regulation,</li>
            <li>use the App to create, upload, or share User Content that is unlawful, harmful, abusive, harassing, defamatory, obscene, hateful, or that infringes the rights of others,</li>
            <li>use the App in a way that could damage, disable, overburden, or impair the App or interfere with the use of the App by others,</li>
            <li>attempt to gain unauthorized access to any accounts, systems, or networks.</li>
          </ul>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            5. Intellectual Property
          </h3>
          <p>
            The App, including all software, design, graphics, text, and other content, is owned by or licensed to Pixflow and is protected by copyright and other intellectual property laws.
          </p>
          <p>
            Except for the limited license granted to you in this Agreement, you have no rights in or to the App or its content. All Pixflow trademarks, logos, and brand elements remain the property of Pixflow.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            6. Third Party Services
          </h3>
          <p>
            The App may include or rely on third party services, such as analytics services like Google Analytics, or app store platforms. Your use of those services may be subject to additional terms and privacy policies of those third parties.
          </p>
          <p>
            Pixflow is not responsible for third party services and is not liable for any damages or losses caused by them.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            7. Updates and Changes to the App
          </h3>
          <p>
            Pixflow may, from time to time, provide updates or new versions of the App, including bug fixes, patches, and new features.
          </p>
          <p>
            We may update the App automatically and you agree that updates may be installed without additional notice. Certain features, such as notifications, may be added in the future.
          </p>
          <p>
            We may modify, suspend, or discontinue the App or any part of it at any time, temporarily or permanently. Where reasonably possible, we will provide notice, but we are not obligated to maintain any particular feature or content.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            8. Term and Termination
          </h3>
          <p>
            This Agreement starts when you first install or use the App and continues until terminated by you or Pixflow.
          </p>
          <p>
            You may terminate this Agreement at any time by deleting the App and, where applicable, closing your account.
          </p>
          <p>
            Pixflow may suspend or terminate your access to the App, or this Agreement, at any time, if:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>you breach this Agreement,</li>
            <li>we believe your use of the App may cause harm or risk to us, the App, or other users,</li>
            <li>we stop providing the App.</li>
          </ul>
          <p>Upon termination:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>the license granted to you will end,</li>
            <li>you must immediately stop using the App and delete all copies from your devices.</li>
          </ul>
          <p>
            Some provisions of this Agreement will survive termination, including ownership provisions, disclaimers, limitations of liability, and governing law.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            9. Disclaimers
          </h3>
          <p>
            The App is provided on an “as is” and “as available” basis, without warranties of any kind, whether express or implied.
          </p>
          <p>
            To the fullest extent permitted by law, Pixflow disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non infringement.
          </p>
          <p>We do not guarantee that:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>the App will be uninterrupted, secure, or error free,</li>
            <li>any defects will be corrected,</li>
            <li>the App will meet your requirements or expectations,</li>
            <li>any content or outputs, such as visual effects or color results, are accurate, complete, or reliable.</li>
          </ul>
          <p>You use the App at your own risk.</p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            10. Limitation of Liability
          </h3>
          <p>
            To the fullest extent permitted by law, Pixflow and its directors, employees, and agents will not be liable for:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>any indirect, incidental, special, consequential, or punitive damages,</li>
            <li>any loss of profits, revenue, data, or goodwill,</li>
          </ul>
          <p>
            arising out of or in connection with your use of, or inability to use, the App, even if we have been advised of the possibility of such damages.
          </p>
          <p>
            To the extent that our liability cannot be excluded, our total aggregate liability arising out of or related to this Agreement or your use of the App will be limited to the greater of:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>the amount you paid, if any, to use the App during the twelve months before the event giving rise to the claim, or</li>
            <li>one hundred euros.</li>
          </ul>
          <p>
            Some jurisdictions do not allow certain limitations or exclusions, so some of the above may not apply to you.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            11. Indemnity
          </h3>
          <p>
            You agree to defend, indemnify, and hold harmless Pixflow and its directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>your use of the App,</li>
            <li>your User Content,</li>
            <li>your breach of this Agreement or of any law or rights of a third party.</li>
          </ul>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            12. Governing Law and Disputes
          </h3>
          <p>
            This Agreement and any dispute or claim arising out of or in connection with it will be governed by the laws of France, without regard to conflict of law rules.
          </p>
          <p>
            If you are a consumer and mandatory laws of your country of residence provide you with stronger protections, those protections remain.
          </p>
          <p>
            You and Pixflow agree to try to resolve any dispute amicably first. If a dispute cannot be resolved informally, it will be submitted to the competent courts of Paris, France, unless mandatory law says otherwise.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            13. Privacy
          </h3>
          <p>
            Your use of the App is also governed by our Privacy Policy, which is incorporated into this Agreement by reference. Please read the Privacy Policy to understand how we collect, use, and protect your information.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            14. Changes to this Agreement
          </h3>
          <p>
            We may update this Agreement from time to time. When we do, we will change the “Last updated” date at the top and may notify you by reasonable means, for example within the App.
          </p>
          <p>
            Your continued use of the App after the updated Agreement becomes effective means you accept the updated terms. If you do not agree, you must stop using the App and delete it.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '28px', marginBottom: '12px' }}>
            15. Contact
          </h3>
          <p>If you have questions about this Agreement, contact us at:</p>
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
            <Mail style={{ width: '20px', height: '20px', color: '#2563EB', marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>Pixflow</p>
              <p style={{ margin: '2px 0 0 0', color: '#64748B' }}>Paris, France</p>
              <p style={{ margin: '4px 0 0 0', color: '#334155' }}>
                Email: <a href="mailto:help@pixflow.net" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>help@pixflow.net</a>
              </p>
              <p style={{ margin: '2px 0 0 0', color: '#334155' }}>
                Website: <a href="https://pixflow.net" target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none' }}>https://pixflow.net</a>
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
