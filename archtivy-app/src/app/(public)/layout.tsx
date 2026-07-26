import { Footer } from "@/components/layout/Footer";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { isMaintenanceMode } from "@/lib/maintenance";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isMaintenanceMode()) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <ConditionalFooter>
        <div className="min-h-[60px] sm:min-h-[80px]" aria-hidden />
        <Footer />
      </ConditionalFooter>
    </>
  );
}
