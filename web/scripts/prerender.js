import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

// Define all public routes with custom SEO Titles, Descriptions, Keywords, Headings, and JSON-LD Schemas
const routes = [
  {
    path: '/',
    title: 'ApplyDesk - AI Auto Apply & Recruiter-Level Resume Scoring',
    description: 'AI that reads job posts like a recruiter — matches your real skills, tailors every resume, and auto-applies only where you are a genuine fit.',
    keywords: 'AI Resume Builder, ATS Resume Scoring, Auto Apply, Job Search, Tech Jobs, Resume Audit, ApplyDesk',
    heading: 'Land 8x More Interviews With Recruiter-Level AI',
    subheading: 'ApplyDesk matches your real skills to top tech jobs, generates ATS-tailored resumes, and auto-applies seamlessly.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'ApplyDesk',
      'url': 'https://applydesk.io',
      'applicationCategory': 'BusinessApplication',
      'operatingSystem': 'All',
      'description': 'Recruiter-level AI resume scoring, ATS optimization, and auto-apply platform for job seekers.',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      }
    }
  },
  {
    path: '/audit',
    title: 'AI Resume Scoring & Audit | ATS Resume Checker - ApplyDesk',
    description: 'Get an instant recruiter-level audit of your resume with ATS compatibility breakdown, metric impact ratings, missing keyword suggestions, and bullet-point optimizations.',
    keywords: 'AI Resume Scoring, ATS Compatibility Score, Resume Audit, ATS Checker, Resume Keyword Match, Resume Optimization',
    heading: 'AI Resume Scoring & Audit',
    subheading: 'Paste your resume text to get an instant breakdown of ATS compatibility, keyword density, metric impact, and bullet-point optimizations.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'ApplyDesk AI Resume Scoring',
      'url': 'https://applydesk.io/audit',
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem': 'All',
      'description': 'Instant recruiter-level ATS resume compatibility audit and bullet-point scoring engine.'
    }
  },
  {
    path: '/jobs',
    title: 'Tech Job Board & Remote Job Opportunities | ApplyDesk',
    description: 'Search thousands of verified tech, software engineering, product, and remote job listings. Match your resume score and auto-apply in one click.',
    keywords: 'Tech Job Board, Remote Jobs, Software Engineer Jobs, Product Manager Jobs, H1B Visa Jobs, ApplyDesk Jobs',
    heading: 'Verified Tech Job Board & Auto-Apply',
    subheading: 'Find top tech jobs with instant ATS match scores, H1B sponsorship filters, and one-click auto-apply.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      'title': 'Tech Jobs & Remote Software Engineering Roles',
      'description': 'Search and auto-apply to top software engineering and tech roles with ApplyDesk AI.',
      'hiringOrganization': {
        '@type': 'Organization',
        'name': 'ApplyDesk Partner Companies'
      }
    }
  },
  {
    path: '/build',
    title: 'AI Resume Builder & ATS CV Generator | ApplyDesk',
    description: 'Build an executive, ATS-formatted resume in minutes. Tailor your bullet points dynamically to match any job description.',
    keywords: 'AI Resume Builder, ATS Resume Generator, Resume Tailoring, CV Maker, Job Match Resume Builder',
    heading: 'AI Resume Builder & ATS Optimizer',
    subheading: 'Create recruiter-ready, ATS-compliant resumes tailored to your target job titles.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'ApplyDesk AI Resume Builder',
      'url': 'https://applydesk.io/build',
      'applicationCategory': 'BusinessApplication'
    }
  },
  {
    path: '/cover-letter',
    title: 'AI Cover Letter Generator for Tech Jobs | ApplyDesk',
    description: 'Generate compelling, personalized cover letters tailored to specific companies and hiring managers in seconds.',
    keywords: 'AI Cover Letter Generator, Cover Letter Builder, Personalized Job Application Letter',
    heading: 'AI Cover Letter Generator',
    subheading: 'Generate tailored cover letters for any job posting in under 10 seconds.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'ApplyDesk Cover Letter Generator',
      'url': 'https://applydesk.io/cover-letter'
    }
  },
  {
    path: '/pricing',
    title: 'Pricing & Credit Plans | ApplyDesk',
    description: 'Affordable plans for active job seekers. Get unlimited AI resume scoring, resume tailoring, cover letters, and auto-applies.',
    keywords: 'ApplyDesk Pricing, AI Resume Plans, Auto Apply Credits, Pro Plan Job Search',
    heading: 'Simple, Transparent Pricing',
    subheading: 'Choose the right plan to supercharge your job search and land interviews faster.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'PriceSpecification',
      'name': 'ApplyDesk Credit Plans',
      'priceCurrency': 'USD'
    }
  },
  {
    path: '/partnership',
    title: 'Partner Program & Affiliate Rewards | ApplyDesk',
    description: 'Join the ApplyDesk Partner Program. Refer job seekers and earn recurring commission on every subscription.',
    keywords: 'ApplyDesk Affiliate Program, Job Search Partner Program, Refer and Earn',
    heading: 'ApplyDesk Partner & Referral Program',
    subheading: 'Earn rewards and commission by helping job seekers land their dream roles.'
  },
  {
    path: '/user-agreement',
    title: 'Terms of Service & User Agreement | ApplyDesk',
    description: 'Read the official ApplyDesk Terms of Service and User Agreement.',
    heading: 'Terms of Service',
    subheading: 'Our commitment to fair, transparent, and secure service.'
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy & Data Security | ApplyDesk',
    description: 'Learn how ApplyDesk protects your personal data, resumes, and job application history with strict privacy controls.',
    heading: 'Privacy Policy',
    subheading: 'Your privacy is paramount. Learn how we handle and protect your data.'
  }
];

function prerender() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error('ERROR: dist/index.html not found! Run vite build first.');
    process.exit(1);
  }

  const indexHtml = fs.readFileSync(templatePath, 'utf8');

  console.log('🚀 Starting Pre-rendering SSG & Static HTML Generation for SEO...');

  for (const route of routes) {
    const routeUrl = `https://applydesk.io${route.path === '/' ? '' : route.path}`;

    // 1. Replace Document Title
    let html = indexHtml.replace(/<title>.*?<\/title>/g, `<title>${route.title}</title>`);

    // 2. Build SEO Head Meta Tags Block
    const metaBlock = `
    <meta name="description" content="${route.description}" />
    <meta name="keywords" content="${route.keywords || ''}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${routeUrl}" />

    <!-- Open Graph Tags -->
    <meta property="og:site_name" content="ApplyDesk" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${route.title}" />
    <meta property="og:description" content="${route.description}" />
    <meta property="og:url" content="${routeUrl}" />
    <meta property="og:image" content="https://applydesk.io/assets/web-home9-6SYcN6VC.png" />

    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${route.title}" />
    <meta name="twitter:description" content="${route.description}" />
    <meta name="twitter:image" content="https://applydesk.io/assets/web-home9-6SYcN6VC.png" />

    ${route.jsonLd ? `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>` : ''}
    `;

    // Inject metaBlock into <head>
    html = html.replace('</head>', `${metaBlock}\n</head>`);

    // 3. Pre-render Static HTML Content into <div id="root"> for zero-JS crawlers & instant FCP
    const staticContent = `
      <div class="prerender-seo-shell" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif;">
        <header style="margin-bottom: 24px;">
          <h1 style="font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">${route.heading}</h1>
          <p style="font-size: 18px; color: #475569; line-height: 1.5;">${route.subheading}</p>
        </header>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #334155;">
          <p style="font-size: 16px; line-height: 1.6;">${route.description}</p>
        </div>
      </div>
    `;

    html = html.replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`);

    // 4. Output Pre-rendered HTML file to corresponding route directory
    if (route.path === '/') {
      fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf8');
      console.log(`  ✅ Pre-rendered: / -> dist/index.html`);
    } else {
      const routeDir = path.join(DIST_DIR, route.path.substring(1));
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf8');
      console.log(`  ✅ Pre-rendered: ${route.path} -> dist/${route.path.substring(1)}/index.html`);
    }
  }

  console.log('🎉 Pre-rendering & SSG Complete! All pages are 100% SEO static HTML ready.');
}

prerender();
