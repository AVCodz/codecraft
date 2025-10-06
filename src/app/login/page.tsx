import { LoginForm } from "@/components/auth/LoginForm";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <LoginForm />
      </div>
    </AuthGuard>
  );
}

export const metadata = {
  title: "Sign In - CodeCraft AI",
  description: "Sign in to your CodeCraft AI account",
};
