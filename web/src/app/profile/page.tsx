import Profile from '../../views/Profile';

export const metadata = {
  title: 'User Profile & Resumes | ApplyDesk',
  description: 'Manage your candidate profile, target job titles, uploaded resumes, and work experience.'
};

export default function Page() {
  return <Profile API_URL="https://api.applydesk.io" />;
}
