import { Footer } from "@/components/layout/Footer";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
