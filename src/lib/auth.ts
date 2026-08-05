import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const db = getDb();
        const user = db
          .prepare("SELECT * FROM users WHERE username = ? AND is_active = 1")
          .get(credentials.username as string) as any;

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) return null;

        // Generate a fresh session token — this invalidates any existing session
        const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        db.prepare(
          "UPDATE users SET last_login_at = datetime('now'), session_token = ? WHERE id = ?"
        ).run(sessionToken, user.id);

        return {
          id: user.id.toString(),
          name: user.display_name,
          username: user.username,
          role: user.role,
          sessionToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.sessionToken = (user as any).sessionToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).sessionToken = token.sessionToken;

        // Validate the session token matches what's in the database
        const db = getDb();
        const dbUser = db.prepare("SELECT session_token FROM users WHERE id = ?").get(parseInt(token.id as string)) as any;
        if (dbUser && token.sessionToken !== dbUser.session_token) {
          // Session was invalidated by a newer login — return minimal session
          return {} as any;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: "authjs.csrf-token",
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
  trustHost: true,
});