import type { Metadata } from 'next';
import '../index.css';
import '../App.css';
import '../views/Partnership.css';
import HeaderNav from '../components/HeaderNav';
import FooterNav from '../components/FooterNav';

export const metadata: Metadata = {
  title: 'ApplyDesk - AI Auto Apply & Recruiter-Level Resume Scoring',
  description: 'AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you are a genuine fit.',
  keywords: 'AI Resume Builder, ATS Resume Scoring, Auto Apply, Job Search, Tech Jobs, Resume Audit, ApplyDesk',
  openGraph: {
    title: 'ApplyDesk - AI Auto Apply & Recruiter-Level Resume Scoring',
    description: 'AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you are a genuine fit.',
    url: 'https://applydesk.io',
    siteName: 'ApplyDesk',
    images: [
      {
        url: 'https://applydesk.io/assets/web-home9-6SYcN6VC.png',
        width: 1200,
        height: 630,
        alt: 'ApplyDesk AI Job Matching'
      }
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ApplyDesk - AI Auto Apply & Recruiter-Level Resume Scoring',
    description: 'AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you are a genuine fit.',
    images: ['https://applydesk.io/assets/web-home9-6SYcN6VC.png']
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body>
        <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <HeaderNav />
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <FooterNav />
        </div>
      </body>
    </html>
  );
}
