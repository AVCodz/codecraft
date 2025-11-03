import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Navbar } from "@/components/ui/layout/Navbar";

export default function RegisterPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4 pt-16">
          <RegisterForm />
        </div>
      </div>
    </AuthGuard>
  );
}

export const metadata = {
  title: "Sign Up - CodeCraft AI",
  description: "Create your CodeCraft AI account",
};
