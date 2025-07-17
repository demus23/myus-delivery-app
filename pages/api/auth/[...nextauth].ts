import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Missing email or password");
        }
        await dbConnect();
        const user = await UserModel.findOne({ email: credentials.email });
        if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
          throw new Error("Invalid email or password");
        }
        // LOG: Check the exact user object from MongoDB
        console.log("MongoDB user object:", user);
        // Prepare the session user object
        const sessionUser = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role, // <-- Should be 'admin' if set in MongoDB
          suiteId: user.suiteId ?? null,
        };
        // LOG: Check what is returned
        console.log("Returning user from authorize:", sessionUser);
        return sessionUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // LOG: What does user look like at JWT stage?
        console.log("User in JWT callback:", user);
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.suiteId = user.suiteId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // LOG: Check the token coming in to session
        console.log("Token in session callback:", token);
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.suiteId = token.suiteId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
