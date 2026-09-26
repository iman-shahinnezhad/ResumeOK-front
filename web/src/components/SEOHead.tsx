import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  jsonLd?: object;
}

const DEFAULT_IMAGE = 'https://applydesk.io/assets/web-home9-6SYcN6VC.png';
const SITE_NAME = 'ApplyDesk';

export default function SEOHead({
  title,
  description,
  keywords = 'AI Resume Builder, ATS Resume Scoring, Auto Apply, Job Search, Tech Jobs, Resume Audit',
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  jsonLd
}: SEOHeadProps) {
  const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : 'https://applydesk.io');

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook / LinkedIn / Telegram */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data Schema for Google Search Rich Results */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
