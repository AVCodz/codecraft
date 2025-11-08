/**
 * ResetPasswordPage - Password reset completion page
 * Handles password reset callback from email with userId and secret token
 * Used in: /reset-password route (callback from Appwrite password recovery email)
 * Features: Token validation, password reset form, success state, redirect to login
 */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/icon/logo";
import { validatePassword } from "@/lib/utils/helpers";
import { clientAuth } from "@/lib/appwrite/auth";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get userId and secret from URL params
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  useEffect(() => {
    // Validate that we have the required params
    if (!userId || !secret) {
      toast.error("Invalid or expired reset link");
      router.push("/auth");
    }
  }, [userId, secret, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate password
    if (!password.trim()) {
      setErrors({ password: "Password is required" });
      toast.error("Password is required");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const errorMsg = passwordValidation.errors[0] || "Invalid password";
      setErrors({ password: errorMsg });
      toast.error(errorMsg);
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      toast.error("Passwords do not match");
      return;
    }

    if (!userId || !secret) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);

    try {
      const result = await clientAuth.updatePasswordRecovery(
        userId,
        secret,
        password
      );

      if (result.success) {
        setIsSuccess(true);
        toast.success("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          router.push("/auth");
        }, 2000);
      } else {
        const errorMsg =
          result.error || "Failed to reset password. Please try again.";
        setErrors({ general: errorMsg });
        toast.error(errorMsg);
      }
    } catch (_err) {
      const errorMsg = "An unexpected error occurred";
      setErrors({ general: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
            <p className="text-muted-foreground mb-4">
              Your password has been successfully reset. Redirecting you to
              login...
            </p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <Logo className="w-12 h-12 mb-4" />
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
            <p className="text-muted-foreground text-sm text-center">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({});
              }}
              error={errors.password}
              placeholder="Enter new password"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors({});
              }}
              error={errors.confirmPassword}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />

            {errors.general && (
              <div className="text-sm text-red-500 text-center">
                {errors.general}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </Button>

            <button
              type="button"
              onClick={() => router.push("/auth")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </form>

          {/* Password Requirements */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium mb-2">Password must contain:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• At least 8 characters</li>
              <li>• At least one uppercase letter</li>
              <li>• At least one lowercase letter</li>
              <li>• At least one number</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
