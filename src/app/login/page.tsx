import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">Mail</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="text-sm bg-zinc-900 text-white px-5 py-2.5 rounded hover:bg-zinc-700 transition-colors"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
