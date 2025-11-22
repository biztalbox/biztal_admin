import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import TopLoadingBar from '@/components/TopLoadingBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Biztal Admin Panel',
  description: 'Admin Panel for managing clients, employees, projects, and invoices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopLoadingBar />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

