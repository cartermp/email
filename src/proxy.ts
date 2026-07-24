export { auth as proxy } from "@/auth";

export const config = {
  // The smoke-test harness has its own server-side environment gate. Keeping
  // it outside auth lets CI exercise the real client interactions without a
  // mailbox account, while normal deployments still return a 404.
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon\\.ico|icon\\.svg|login|smoke-tests).*)"],
};
