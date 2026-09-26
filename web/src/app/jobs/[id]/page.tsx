import JobDetails from '../../../views/JobDetails';

export const metadata = {
  title: 'Job Details & ATS Match Breakdown | ApplyDesk',
  description: 'View full job requirements, company overview, H1B visa sponsorship status, and ATS resume match breakdown.'
};

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: 'default' }
  ];
}

export default function Page() {
  return <JobDetails />;
}
