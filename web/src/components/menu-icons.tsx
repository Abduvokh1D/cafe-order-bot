import type { ReactNode } from "react";

function Icon({ children, className = "size-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function MinusIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function BackIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </Icon>
  );
}

export function LocateIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 3 3 10.5l7.5 3L14 21z" />
    </Icon>
  );
}

export function CutleryIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M7 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M9 3v18M17 21v-7M17 14c-2 0-3-2-3-5.5S15.5 3 17 3z" />
    </Icon>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m5 13 4 4L19 7" />
    </Icon>
  );
}

export function MenuIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M7 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M9 3v18M17 21v-7M17 14c-2 0-3-2-3-5.5S15.5 3 17 3z" />
    </Icon>
  );
}

export function CartIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      <path d="M9 11V7a3 3 0 0 1 6 0v4" />
    </Icon>
  );
}

export function OrdersIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  );
}
