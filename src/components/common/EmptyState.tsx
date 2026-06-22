import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

function DefaultInboxIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="4"
        stroke="#d6d3d1"
        strokeWidth="2"
        fill="white"
      />
      <path
        d="M6 28h9l3 4h12l3-4h9"
        stroke="#d6d3d1"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 20h16M16 24h10"
        stroke="#e7e5e4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 text-[#d6d3d1]">
        {icon ?? <DefaultInboxIcon />}
      </div>

      <h3 className="text-base font-semibold text-[#0c0a09] mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-[#777169] max-w-sm mb-6">{description}</p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
