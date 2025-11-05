import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      suiteId?: string | null;
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    role?: string;
    suiteId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    suiteId?: string | null;
  }
}
