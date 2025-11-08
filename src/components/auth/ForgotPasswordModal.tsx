/**
 * ForgotPasswordModal - Modal for initiating password recovery
 * Sends password reset email via Appwrite's recovery API
 * Used in: AuthForm component when user clicks "Forgot Password?"
 * Features: Email validation, loading states, success state, error handling
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isValidEmail } from "@/lib/utils/helpers";
import { clientAuth } from "@/lib/appwrite/auth";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email
    if (!email.trim()) {
      setError("Email is required");
      toast.error("Email is required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Invalid email address");
      toast.error("Invalid email address");
      return;
    }

    setIsLoading(true);

    try {
      const result = await clientAuth.createPasswordRecovery(email.trim());

      if (result.success) {
        setEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        const errorMsg = result.error || "Failed to send reset email";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (_err) {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setEmailSent(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {!emailSent ? (
                <>
                  {/* Header */}
                  <div className="mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      Forgot Password?
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      No worries! Enter your email and we&apos;ll send you a
                      link to reset your password.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      error={error}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                      loading={isLoading}
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      Check Your Email
                    </h2>
                    <p className="text-muted-foreground text-sm mb-6">
                      We&apos;ve sent a password reset link to{" "}
                      <span className="font-medium text-foreground">
                        {email}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      The link will expire in 1 hour. If you don&apos;t see the
                      email, check your spam folder.
                    </p>
                    <Button
                      onClick={handleClose}
                      className="w-full bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                    >
                      Got it
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
