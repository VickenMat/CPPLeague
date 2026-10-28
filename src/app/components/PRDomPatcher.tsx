'use client';

import { useEffect } from 'react';

/**
 * Post-mount patching for the interactive PowerRanking UI:
 * - Force “Save” button to cream (#D9D7B6).
 * - Center & accent-frame the “Unassigned — League A/B” boxes.
 */
export default function PRDomPatcher() {
  useEffect(() => {
    const root = document.getElementById('pr-board');
    if (!root) return;

    /* 1) Save button → cream (with !important) */
    const saveBtn = Array.from(
      root.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a, [role="button"]')
    ).find((el) => /(^|\s)save(\s|$)/i.test(el.textContent || ''));
    if (saveBtn) {
      (saveBtn.style as any).setProperty('background-color', '#D9D7B6', 'important');
      (saveBtn.style as any).setProperty('color', '#000', 'important');
      saveBtn.classList.add('rounded-xl', 'px-4', 'py-2', 'font-semibold', 'hover:opacity-90', 'transition');
    }

    /* 2) Unassigned A/B tiles → centered + same accent frame as aggregates */
    const applyAccent = (el: HTMLElement, color: 'red' | 'blue') => {
      el.classList.add(
        'relative',
        'rounded-2xl',
        'border-2',
        'bg-black/20',
        'shadow-lg',
        'text-center',
        'p-4',
        'before:absolute',
        'before:left-0',
        'before:top-0',
        'before:h-1.5',
        'before:w-full',
        'before:rounded-t-2xl',
        'before:content-[""]'
      );
      if (color === 'red') {
        el.classList.add('border-red-600', 'before:bg-red-600');
        el.classList.remove('border-blue-600', 'before:bg-blue-600');
      } else {
        el.classList.add('border-blue-600', 'before:bg-blue-600');
        el.classList.remove('border-red-600', 'before:bg-red-600');
      }
      el.classList.add('mx-auto'); // center
      // make heading/text white if present
      const heading = el.querySelector<HTMLElement>('h3,h4,h5,div,span');
      if (heading) heading.classList.add('text-white', 'text-center', 'font-semibold');
    };

    const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
    const isA = (t: string) => /unassigned/i.test(t) && /(league\s*A|\bA\b)/i.test(t);
    const isB = (t: string) => /unassigned/i.test(t) && /(league\s*B|\bB\b)/i.test(t);

    for (const el of all) {
      const txt = (el.textContent || '').trim();
      if (!txt) continue;

      if (isA(txt)) {
        const card = el.closest<HTMLElement>('.rounded-2xl, .rounded-xl, .border, section, div') || el;
        applyAccent(card, 'red');
      } else if (isB(txt)) {
        const card = el.closest<HTMLElement>('.rounded-2xl, .rounded-xl, .border, section, div') || el;
        applyAccent(card, 'blue');
      }
    }
  }, []);

  return null;
}
