import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <Container className={`py-6 sm:py-8 ${className}`.trim()}>
      {children}
    </Container>
  );
}
