import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage your team members and their account status',
};
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark);
    document.documentElement.classList.toggle('dark', dark);

    var collapsed = localStorage.getItem('sidebar:collapsed') === '1';
    var stored = Number(localStorage.getItem('sidebar:width'));
    var width = collapsed ? 76 : (stored > 0 ? Math.min(420, Math.max(208, stored)) : 256);
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    document.documentElement.style.setProperty('--sidebar-w', width + 'px');
  } catch (e) {}
})();
`;
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
