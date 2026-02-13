'use client';

import React from 'react';
import { ToastState } from '../types';

interface ToastProps {
  toast: ToastState;
}

const typeConfig = {
  success: 'bg-primary text-white',
  error: 'bg-error text-white',
  info: 'bg-primary text-white',
} as const;

export default function Toast({ toast }: ToastProps) {
  if (!toast.show) return null;

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100]
        ${typeConfig[toast.type]}
        px-4 py-2 rounded-lg
        text-[13px] font-medium
        shadow-md whitespace-nowrap
        animate-slide-up
      `}
    >
      {toast.message}
    </div>
  );
}
