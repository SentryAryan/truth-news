import { ThemedSignIn } from "@/components/auth/themed-sign-in";

export default function SignInPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <ThemedSignIn />
    </main>
  );
}
