import type { SVGProps } from 'react';

export function EzConvertLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EzConvert Logo"
      {...props}
    >
      <rect width="36" height="36" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M10 12L16 18L10 24"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 12H26"
        stroke="hsl(var(--accent))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 18H26"
        stroke="hsl(var(--accent))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
       <path
        d="M20 24H26"
        stroke="hsl(var(--accent))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
