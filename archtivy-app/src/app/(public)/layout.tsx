import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <div className="min-h-[60px] sm:min-h-[80px]" aria-hidden />
      <Footer />
    </>
  );
}
