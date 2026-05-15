import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[auth] missing email or password");
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        console.error(
          `[auth] attempt email='${email}' pwLen=${credentials.password.length}`
        );

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          console.error(`[auth] no user for '${email}'`);
          return null;
        }
        if (!user.passwordHash) {
          console.error("[auth] user has no passwordHash");
          return null;
        }

        const valid = await compare(credentials.password, user.passwordHash);
        console.error(`[auth] bcrypt valid=${valid}`);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? "") as string;
        session.user.role = (token.role ?? "member") as string;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
