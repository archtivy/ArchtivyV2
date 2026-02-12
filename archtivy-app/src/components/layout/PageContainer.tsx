import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 sm:py-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
