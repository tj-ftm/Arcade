import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster";
import { Luckiest_Guy, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/web3/Web3Provider';

const luckiestGuy = Luckiest_Guy({ 
  subsets: ['latin'], 
  weight: '400', 
  variable: '--font-luckiest-guy',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
});


export const metadata: Metadata = {
  title: 'Sonic Arcade',
  description: 'Play games and earn ARC tokens!',
  icons: {
    icon: '/arcade_icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${luckiestGuy.variable} ${spaceGrotesk.variable} font-body antialiased`}>
        <Web3Provider>
          {children}
        </Web3Provider>
        <Toaster />
      </body>
    </html>
  );
}
