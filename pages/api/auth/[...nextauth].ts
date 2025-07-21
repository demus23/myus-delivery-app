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
        // Step 1: Log received credentials (Never log plain passwords in production!)
        console.log('Received credentials:', { email: credentials?.email });

        // Step 2: Check for missing credentials
        if (!credentials?.email || !credentials.password) {
          console.log('Missing email or password');
          throw new Error("Missing email or password");
        }

        // Step 3: Connect to database
        await dbConnect();
        console.log('Database connected.');

        // Step 4: Look up user by email
        const user = await UserModel.findOne({ email: credentials.email });
        console.log('User found:', user);

        // Step 5: If no user found, fail
        if (!user) {
          console.log('No user with this email');
          throw new Error("Invalid email or password");
        }

        // Step 6: Compare passwords
        const passwordMatches = await bcrypt.compare(credentials.password, user.password);
        console.log('Password matches:', passwordMatches);

        if (!passwordMatches) {
          console.log('Password does not match');
          throw new Error("Invalid email or password");
        }

        // Step 7: Build the session user object
        const sessionUser = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          suiteId: user.suiteId ?? null,
        };
        console.log("Returning user from authorize:", sessionUser);
        return sessionUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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
