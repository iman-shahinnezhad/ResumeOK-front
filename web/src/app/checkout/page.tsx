'use client';

import Checkout from '../../views/Checkout';

export default function Page() {
  return <Checkout user={null} setUser={() => {}} token={null} API_URL="https://api.applydesk.io" />;
}
