import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster";
import { Luckiest_Guy, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/web3/Web3Provider';
import { HDRProvider } from '@/components/hdr/HDRProvider';

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
  title: 'Retro Arcade',
  description: 'Play games and earn ARC tokens!',
  icons: {
    icon: '/arcade_icon.png',
  },
  other: {
    'color-scheme': 'dark light',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark light' }}>
      <head>
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="light dark" />
      </head>
      <body className={`${luckiestGuy.variable} ${spaceGrotesk.variable} font-body antialiased`} style={{ colorScheme: 'dark light' }}>
        <HDRProvider>
          <Web3Provider>
            {children}
          </Web3Provider>
          <Toaster />
        </HDRProvider>
      </body>
    </html>
  );
}
