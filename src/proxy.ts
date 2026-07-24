export { auth as proxy } from "@/auth";

export const config = {
  // The avatar route authenticates its own requests, and the smoke-test
  // harness has its own server-side environment gate.
  matcher: ["/((?!api/auth|api/avatar|api/health|_next/static|_next/image|favicon\\.ico|icon\\.svg|login|smoke-tests).*)"],
};
