
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and should not be accessed directly.
// User creation is now handled by admins in the /dashboard/users page.
export default function DeprecatedSignupPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}

    