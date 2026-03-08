import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        token.picture = profile.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (token.picture) {
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
});
