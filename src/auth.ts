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
      const { pathname, searchParams } = request.nextUrl;
      const isRsc = searchParams.has("_rsc");
      // Structured JSON so this lands in the same log stream as pino output.
      console.log(JSON.stringify({
        level: isAuthed ? 30 : 40,
        time: new Date().toISOString(),
        service: "email",
        msg: isAuthed ? "proxy.allow" : "proxy.redirect",
        method: request.method,
        pathname,
        is_rsc: isRsc,
        user: session?.user?.email ?? null,
      }));
      return isAuthed;
    },
  },
  pages: {
    signIn: "/login",
  },
});
