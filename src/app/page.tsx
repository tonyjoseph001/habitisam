"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('habitisim-onboarding-completed');
    if (hasSeenOnboarding === 'true') {
      router.replace('/login');
    } else {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-24 bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  );
}
