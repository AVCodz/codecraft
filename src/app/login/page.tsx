import { LoginForm } from "@/components/auth/LoginForm";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Navbar } from "@/components/ui/layout/Navbar";

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-screen px-4 pt-16">
          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  );
}

export const metadata = {
  title: "Sign In - CodeCraft AI",
  description: "Sign in to your CodeCraft AI account",
};
