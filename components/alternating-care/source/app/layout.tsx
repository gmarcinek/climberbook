import '@styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PropsWithChildren } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoot from './AppRoot';
import QueryClientContext from './QueryClientContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Opieka Naprzemienna',
  description: 'Opieka Naprzemienna next app',
};

export default function RootLayout(props: PropsWithChildren) {
  return (
    <html lang='pl' className='bg-gray-100'>
      <body className={inter.className}>
        <QueryClientContext>
          <AppRoot>{props.children}</AppRoot>
        </QueryClientContext>
        <ToastContainer
          position='top-right'
          hideProgressBar
          closeOnClick
          pauseOnHover
          closeButton={false}
        />
      </body>
    </html>
  );
}
