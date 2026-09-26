import Link from 'next/link';

export default function FooterNav() {
  return (
    <footer className="resumeok-footer no-print">
      <div className="container footer-content">
        <p className="footer-text">
          © {new Date().getFullYear()} ApplyDesk. 100% Private.
        </p>
        <div className="footer-links">
          <Link href="/partnership">Partner Program</Link>
          <span>|</span>
          <Link href="/privacy-policy">
            Privacy Policy
          </Link>
          <span>|</span>
          <Link href="/user-agreement">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
