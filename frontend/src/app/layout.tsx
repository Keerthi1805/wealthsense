import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'WealthSense AI — Intelligent Finance Platform',
  description: 'AI-powered personal finance: auto-categorization, fraud detection, budget forecasting, GPT-4 advisor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
