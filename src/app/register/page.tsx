import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function RegisterPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <RegisterForm />
      </div>
    </AuthGuard>
  );
}

export const metadata = {
  title: "Sign Up - CodeCraft AI",
  description: "Create your CodeCraft AI account",
};
