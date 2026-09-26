import Match from '../../views/Match';

export const metadata = {
  title: 'Match Resume with Job Description | ApplyDesk',
  description: 'Upload your resume and paste a job post URL to get an instant match score and missing keyword analysis.'
};

export default function Page() {
  return <Match apiUrl="https://api.applydesk.io" />;
}
