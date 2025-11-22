'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure NProgress to be red
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
});

export default function TopLoadingBar() {
  const pathname = usePathname();

  useEffect(() => {
    // Start progress bar
    NProgress.start();

    // Complete progress bar after a short delay
    const timer = setTimeout(() => {
      NProgress.done();
    }, 300);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname]);

  return null;
}
