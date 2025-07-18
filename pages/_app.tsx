import 'bootstrap/dist/css/bootstrap.min.css';
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import '../styles/globals.css'


export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
