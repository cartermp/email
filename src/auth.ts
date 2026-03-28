import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = "phillip.phillipcarter.carter@gmail.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      return profile?.email === ALLOWED_EMAIL;
    },
    authorized({ auth: session, request }) {
      const isAuthed = !!session?.user;
      // Only log when auth fails (redirect) — allow is too noisy (fires on
      // every request, including RSC refetches and static assets).
      if (!isAuthed) {
        const { pathname, searchParams } = request.nextUrl;
        console.log(JSON.stringify({
          level: 40,
          time: new Date().toISOString(),
          service: "email",
          msg: "proxy.redirect",
          method: request.method,
          pathname,
          is_rsc: searchParams.has("_rsc"),
          user: null,
        }));
      }
      return isAuthed;
    },
  },
  pages: {
    signIn: "/login",
  },
});
