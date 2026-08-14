import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "User Management",
  description: "Manage your team members and their account status",
};

/**
 * Applies the saved theme BEFORE the browser paints.
 *
 * Without this the page renders in light mode, React hydrates, the toggle
 * reads localStorage, and only then does the class flip — a white flash on
 * every navigation for anyone using dark mode. This is the one legitimate use
 * of a blocking inline script: it must run before first paint, so it cannot be
 * a React effect.
 *
 * The try/catch matters because localStorage throws in some privacy modes, and
 * an exception here would abort the script and take the theme with it.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning because the script above mutates <html>'s
    // className before React hydrates. Without it React logs a mismatch for a
    // difference we caused deliberately. It suppresses the warning on THIS
    // element only, not the whole tree.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
