// lib/requireAdmin.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { GetServerSidePropsContext } from 'next';

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  // ✅ non-null assertion fixes TS error
  const session = await getServerSession(ctx.req!, ctx.res!, authOptions);

  if (!session || session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return { props: { session } };
}


