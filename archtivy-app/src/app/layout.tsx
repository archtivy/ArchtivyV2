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
import { isMaintenanceMode } from "@/lib/maintenance";
import { getBaseUrl } from "@/lib/canonical";
import { Analytics } from "@vercel/analytics/react"; // ✅ bunu ekle

export const runtime = "nodejs";

const OG_IMAGE = {
  url: "/og",
  width: 1200,
  height: 630,
  alt: "Archtivy — Projects, products, designers & brands for architecture",
};

export const metadata: Metadata = {
  // Without metadataBase, Next.js emits every `alternates.canonical` as a RELATIVE
  // URL (<link rel="canonical" href="/projects">), which makes every host and
  // query-param variant self-canonical and disables canonicalisation entirely.
  // See TECHNICAL_SEO_AUDIT.md C-3.
  metadataBase: new URL(getBaseUrl()),
  title: "Archtivy",
  description: "Projects, products, credits & files for architecture",
  verification: {
    google: "p9zsrg-G8wu-5q_DLHfCVOevAN9VQimmXZ6AC-ynPb4",
  },
  openGraph: {
    siteName: "Archtivy",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
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
  const maintenance = isMaintenanceMode();

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en" suppressHydrationWarning className={lato.variable}>
        <head>
          {!maintenance && (
            <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          )}
        </head>
        <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
          {maintenance ? (
            children
          ) : (
            <ThemeProvider>
              <SiteShell>{children}</SiteShell>
            </ThemeProvider>
          )}

          {/* ✅ BURAYA EKLE */}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}