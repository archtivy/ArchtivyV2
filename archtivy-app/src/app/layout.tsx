import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SiteShell } from "@/components/layout/SiteShell";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Archtivy",
  description: "Projects, products, credits & files for architecture",
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
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
          <ThemeProvider>
            <SiteShell>{children}</SiteShell>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
