import Login from '../../views/Login';

export const metadata = {
  title: 'Log In or Sign Up | ApplyDesk',
  description: 'Sign up or log in to ApplyDesk to access AI resume builder, recruiter-level resume scoring, and auto-apply.'
};

export default function Page() {
  return <Login API_URL="https://api.applydesk.io" />;
}
