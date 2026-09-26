import CoverLetter from '../../views/CoverLetter';

export const metadata = {
  title: 'AI Cover Letter Generator for Tech Jobs | ApplyDesk',
  description: 'Generate compelling, personalized cover letters tailored to specific companies and hiring managers in seconds.'
};

export default function Page() {
  return <CoverLetter apiUrl="https://api.applydesk.io" />;
}
