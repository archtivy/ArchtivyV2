import { Footer } from "@/components/layout/Footer";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { isProductionMaintenance } from "@/lib/maintenance";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isProductionMaintenance()) {
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
