import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SiteShell } from "@/components/layout/SiteShell";
import { Analytics } from "@vercel/analytics/react"; // ✅ bunu ekle

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Archtivy",
  description: "Projects, products, credits & files for architecture",
  verification: {
    google: "p9zsrg-G8wu-5q_DLHfCVOevAN9VQimmXZ6AC-ynPb4",
  },
};

const themeScript = `
(function(){
  var t = localStorage.getItem('archtivy-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en" suppressHydrationWarning className={lato.variable}>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
          <ThemeProvider>
            <SiteShell>{children}</SiteShell>
          </ThemeProvider>

          {/* ✅ BURAYA EKLE */}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}