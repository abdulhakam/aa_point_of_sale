// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import { ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';
import Providers from './providers';


export const metadata = {
  title: 'aa POS App',
  description: 'A Point of Sale app for small businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}