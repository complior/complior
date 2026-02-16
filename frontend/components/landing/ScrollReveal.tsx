'use client';

import { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function ScrollReveal({ children, id, className }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      el.querySelectorAll('.rv').forEach((child) => {
        child.classList.add('vis');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const rvEls = el.querySelectorAll('.rv');
            if (rvEls.length > 0) {
              reveal();
              observer.unobserve(entry.target);
            }
            // If no .rv elements yet (dynamic loading), keep observing
          }
        });
      },
      { threshold: 0.05 }
    );

    // Also use MutationObserver to catch dynamically loaded content
    const mutObs = new MutationObserver(() => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        reveal();
        mutObs.disconnect();
        observer.disconnect();
      }
    });
    mutObs.observe(el, { childList: true, subtree: true });

    observer.observe(el);
    return () => {
      observer.disconnect();
      mutObs.disconnect();
    };
  }, []);

  return (
    <div ref={ref} id={id} className={className}>
      {children}
    </div>
  );
}
