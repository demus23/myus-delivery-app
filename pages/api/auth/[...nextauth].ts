// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { generateUniqueSuiteId as generateSuiteId } from "@/lib/suite";

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
        console.log("Received credentials:", { email: credentials?.email });

        // Step 2: Check for missing credentials
        if (!credentials?.email || !credentials.password) {
          console.log("Missing email or password");
          throw new Error("Missing email or password");
        }

        // Step 3: Connect to database
        await dbConnect();
        console.log("Database connected.");

        // Step 4: Look up user by email
        const user = await UserModel.findOne({ email: credentials.email });
        console.log("User found:", user);

        // Step 5: If no user found, fail
        if (!user) {
          console.log("No user with this email");
          throw new Error("Invalid email or password");
        }

        // Step 6: Compare passwords
        const passwordMatches = await bcrypt.compare(credentials.password, user.password);
        console.log("Password matches:", passwordMatches);

        if (!passwordMatches) {
          console.log("Password does not match");
          throw new Error("Invalid email or password");
        }

        // Step 7: Auto-assign Suite ID if missing (unique & retried)
        if (!user.suiteId) {
          for (let i = 0; i < 5; i++) {
            const candidate = generateSuiteId();
            const exists = await UserModel.exists({ suiteId: candidate });
            if (!exists) {
              user.suiteId = candidate;
              await user.save();
              break;
            }
          }
        }

        // Step 8: Build the session user object
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
        token.id = (user as any).id;
        token.email = (user as any).email;
        token.name = (user as any).name;
        token.role = (user as any).role;
        token.suiteId = (user as any).suiteId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        console.log("Token in session callback:", token);
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role as string;
        (session.user as any).suiteId = token.suiteId as string | null;
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
