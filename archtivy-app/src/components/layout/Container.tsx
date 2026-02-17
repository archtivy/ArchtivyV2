import type { ReactNode } from "react";

export const CONTENT_MAX_WIDTH = 1040;

interface ContainerProps {
  children: ReactNode;
  /** Optional extra classes (e.g. flex, py-*). Horizontal padding is set by Container. */
  className?: string;
}

/**
 * Single source of truth for main content width.
 * - Desktop (lg+): 1040px content area, no horizontal padding.
 * - Tablet (sm/md): max-w 1040 + px-6.
 * - Mobile: max-w 1040 + px-4.
 */
export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[1040px] px-4 sm:px-6 lg:px-0 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
