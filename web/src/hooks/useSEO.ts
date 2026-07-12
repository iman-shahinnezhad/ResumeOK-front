import { useEffect } from 'react';

export default function useSEO(title: string, description: string) {
  useEffect(() => {
    const fullTitle = `${title} | ResumeOK`;
    document.title = fullTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Update Open Graph Title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', fullTitle);
    }

    // Update Open Graph Description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', description);
    }
  }, [title, description]);
}
