import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import { AppProps } from 'next/app'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { SessionProvider } from "next-auth/react"
import { MantineProvider } from '@mantine/core';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider>
    <SessionProvider session={pageProps.session}>
      <>
        <Component {...pageProps} />
        <ToastContainer position="top-right" autoClose={3000} />
      </>
    </SessionProvider>
    </MantineProvider>
  )
}
