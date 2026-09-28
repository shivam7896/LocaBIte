import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', compact = false }) => {
  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-10' : 'h-8';

  if (compact) {
    return (
      <div className={`flex items-center select-none shrink-0 ${className}`}>
        <svg className={`${heightClass} w-auto`} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#F04F23" />
          <path
            d="M12 12C12 10.8954 12.8954 10 14 10H22C25.3137 10 28 12.6863 28 16C28 19.3137 25.3137 22 22 22H17V28C17 29.1046 16.1046 30 15 30H14C12.8954 30 12 29.1046 12 28V12Z"
            fill="white"
          />
          <circle cx="26" cy="24" r="3.5" fill="#10B981" />
          <path d="M20 13L25 18" stroke="#F04F23" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      <svg className={`${heightClass} w-auto shrink-0`} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="12" fill="#F04F23" />
        <path
          d="M12 12C12 10.8954 12.8954 10 14 10H22C25.3137 10 28 12.6863 28 16C28 19.3137 25.3137 22 22 22H17V28C17 29.1046 16.1046 30 15 30H14C12.8954 30 12 29.1046 12 28V12Z"
          fill="white"
        />
        <circle cx="26" cy="24" r="3.5" fill="#10B981" />
        <path d="M20 13L25 18" stroke="#F04F23" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-headline-sm text-headline-sm font-extrabold text-on-surface tracking-tight leading-none">
        Loca<span className="text-primary">Bite</span>
      </span>
    </div>
  );
};
