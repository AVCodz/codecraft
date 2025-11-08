/**
 * AuthForm - Unified authentication form with toggle between Sign Up and Login
 * Features: Animated toggle, gradient background, line shadow effects
 * Used in: Auth page (/auth) for user authentication and registration
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/stores/authStore";
import { isValidEmail, validatePassword } from "@/lib/utils/helpers";
import { GoogleOAuthButton } from "../ui/GoogleOAuthButton";
import { Logo } from "../ui/icon/logo";
import { LineShadowText } from "../ui/LineShadowText";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

type AuthMode = "signup" | "login";
type SignupStep = 1 | 2;

// Typing animation suggestions
const TAGLINE_SUGGESTIONS = [
  "create stunning web apps...",
  "build your dream project...",
  "turn ideas into reality...",
  "develop amazing features...",
  "design beautiful interfaces...",
];

interface AuthFormProps {
  initialMode?: AuthMode;
}

export function AuthForm({ initialMode = "signup" }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp, error } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [taglineText, setTaglineText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Use refs to avoid closure issues and improve performance
  const animationRef = useRef<{
    currentIndex: number;
    currentCharIndex: number;
    isDeleting: boolean;
    timeoutId: NodeJS.Timeout | null;
  }>({
    currentIndex: 0,
    currentCharIndex: 0,
    isDeleting: false,
    timeoutId: null,
  });

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Optimized typewriter effect with useCallback and refs
  const typeWriter = useCallback(() => {
    const { currentIndex, currentCharIndex, isDeleting } = animationRef.current;
    const currentSuggestion = TAGLINE_SUGGESTIONS[currentIndex];

    if (!isDeleting) {
      // Typing forward
      if (currentCharIndex <= currentSuggestion.length) {
        setTaglineText(currentSuggestion.slice(0, currentCharIndex));
        animationRef.current.currentCharIndex++;
        animationRef.current.timeoutId = setTimeout(typeWriter, 50); // Slightly faster for smoother feel
      } else {
        // Finished typing, wait before deleting
        animationRef.current.timeoutId = setTimeout(() => {
          animationRef.current.isDeleting = true;
          typeWriter();
        }, 2000); // Reduced pause for better flow
      }
    } else {
      // Deleting backward
      if (currentCharIndex > 0) {
        animationRef.current.currentCharIndex--;
        setTaglineText(currentSuggestion.slice(0, currentCharIndex - 1));
        animationRef.current.timeoutId = setTimeout(typeWriter, 25); // Faster deletion
      } else {
        // Finished deleting, move to next suggestion
        animationRef.current.isDeleting = false;
        animationRef.current.currentIndex =
          (currentIndex + 1) % TAGLINE_SUGGESTIONS.length;
        animationRef.current.currentCharIndex = 0;
        animationRef.current.timeoutId = setTimeout(typeWriter, 300); // Shorter pause between phrases
      }
    }
  }, []);

  // Start typing animation
  useEffect(() => {
    animationRef.current.timeoutId = setTimeout(typeWriter, 800);

    return () => {
      if (animationRef.current.timeoutId) {
        clearTimeout(animationRef.current.timeoutId);
      }
    };
  }, [typeWriter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
      toast.error("Password is required");
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
        toast.error(passwordValidation.errors[0]);
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
      toast.error("Please confirm your password");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      toast.error("Passwords do not match");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setSignupStep(2);
    }
  };

  const handleBackStep = () => {
    setSignupStep(1);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!validateLoginForm()) return;
    } else {
      if (signupStep === 1) {
        handleNextStep();
        return;
      }
      if (!validateStep2()) return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn(formData.email, formData.password);
        if (result.success) {
          toast.success("Welcome back! Signed in successfully");
          router.push("/");
        } else {
          const errorMsg = result.error || "Invalid credentials";
          toast.error(errorMsg);
          setErrors({ general: errorMsg });
        }
      } else {
        const result = await signUp(
          formData.email,
          formData.password,
          formData.name.trim()
        );
        if (result.success) {
          toast.success("Account created successfully! Welcome aboard 🎉");
          router.push("/");
        } else {
          const errorMsg = result.error || "Failed to create account";
          // Check for specific error types
          if (
            errorMsg.toLowerCase().includes("already exists") ||
            errorMsg.toLowerCase().includes("already registered")
          ) {
            toast.error("An account with this email already exists");
          } else {
            toast.error(errorMsg);
          }
          setErrors({ general: errorMsg });
        }
      }
    } catch (_error) {
      const errorMsg = "An unexpected error occurred";
      toast.error(errorMsg);
      setErrors({ general: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: AuthMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      setSignupStep(1);
      setErrors({});
    }
  };

  return (
    <div className="relative scrollbar-none min-h-screen overflow-hidden bg-background flex items-center justify-center p-4">
      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-6xl bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* Left Side - Branding - Hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex relative bg-gradient-to-br from-primary/20 via-background to-background p-12 flex-col justify-center items-center border-r border-border overflow-hidden"
          >
            {/* Gradient background - only on left side */}
            <div className="flex flex-col items-end absolute -right-60 -top-10 blur-xl z-0">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0, ease: "easeOut" }}
                style={{ transformOrigin: "top right" }}
                className="h-[10rem] rounded-full w-[60rem] z-1 bg-gradient-to-b blur-[6rem] from-blue-600 to-sky-800"
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                style={{ transformOrigin: "top right" }}
                className="h-[10rem] rounded-full w-[90rem] z-1 bg-gradient-to-b blur-[6rem] from-blue-900 to-blue-400"
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                style={{ transformOrigin: "top right" }}
                className="h-[10rem] rounded-full w-[60rem] z-1 bg-gradient-to-b blur-[6rem] from-neutral-600 to-sky-600"
              />
            </div>
            <div className="absolute inset-0 z-0 bg-noise opacity-20" />
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10 z-0">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <div className="relative z-10 text-center space-y-8">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.4,
                }}
                className="flex justify-center"
              >
                <Logo size={80} className="text-primary" />
              </motion.div>

              {/* Brand Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <LineShadowText
                  className="font-brand text-6xl font-bold"
                  shadowColor="rgba(255, 255, 255, 0.3)"
                >
                  VibeIt
                </LineShadowText>
              </motion.div>

              {/* Tagline with Typing Animation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="relative"
              >
                <div className="px-4 py-4 bg-muted/30 backdrop-blur-sm border border-border rounded-2xl h-44 flex w-sm text-left">
                  <p className="text-lg text-foreground/90 font-medium leading-relaxed">
                    Let Vibe it help you to{" "}
                    <span className="text-foreground break-words min-w-[2ch]">
                      {taglineText}
                      <span
                        className={`inline-block  ml-0.5 transition-opacity duration-100 ${
                          showCursor ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        |
                      </span>
                    </span>
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-8 md:p-12 flex flex-col"
          >
            {/* Toggle Buttons */}
            <div className="flex gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-xl mb-8">
              <button
                type="button"
                onClick={() => toggleMode("signup")}
                className="relative flex-1 px-6 py-3 rounded-lg font-medium text-foreground outline-none transition-colors cursor-pointer"
              >
                {mode === "signup" && (
                  <motion.div
                    layoutId="active-auth-tab"
                    className="absolute inset-0 bg-background border-2 border-border shadow-lg rounded-lg"
                    transition={{ type: "spring", duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">Sign Up</span>
              </button>
              <button
                type="button"
                onClick={() => toggleMode("login")}
                className="relative flex-1 px-6 py-3 rounded-lg font-medium text-foreground outline-none transition-colors cursor-pointer"
              >
                {mode === "login" && (
                  <motion.div
                    layoutId="active-auth-tab"
                    className="absolute inset-0 bg-background border-2 border-border shadow-lg rounded-lg"
                    transition={{ type: "spring", duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">Login</span>
              </button>
            </div>

            {/* Form Title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${signupStep}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <h2 className="text-2xl font-bold mb-2">
                  {mode === "signup"
                    ? signupStep === 1
                      ? "Create Your Account"
                      : "Set Your Password"
                    : "Welcome Back"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "signup"
                    ? signupStep === 1
                      ? "Sign up and start exploring features tailored just for you."
                      : "Choose a strong password to secure your account."
                    : "Sign in to your VibeIt account"}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              {(errors.general || error) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
                >
                  {errors.general || error}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${signupStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {mode === "signup" ? (
                    signupStep === 1 ? (
                      // Step 1: Name and Email
                      <>
                        <Input
                          label="Full Name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          error={errors.name}
                          placeholder="John Doe"
                          autoComplete="name"
                          required
                        />
                        <Input
                          label="Email Address"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          error={errors.email}
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                        />
                      </>
                    ) : (
                      // Step 2: Password
                      <>
                        <Input
                          label="Password"
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          error={errors.password}
                          placeholder="Create a strong password"
                          autoComplete="new-password"
                          required
                        />
                        <Input
                          label="Confirm Password"
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          error={errors.confirmPassword}
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                          required
                        />
                      </>
                    )
                  ) : (
                    // Login Form
                    <>
                      <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                      <div>
                        <Input
                          label="Password"
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          error={errors.password}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                        />

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-primary hover:text-primary/80 transition-colors mt-2 font-medium cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Buttons - Back and Submit on same line for Step 2 */}
              {mode === "signup" && signupStep === 2 ? (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 cursor-pointer"
                    onClick={handleBackStep}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading
                    ? mode === "signup"
                      ? "Please wait..."
                      : "Signing in..."
                    : mode === "signup"
                    ? "Next"
                    : "Sign in"}
                </Button>
              )}
            </form>

            {/* Divider - Only show on login or signup step 1 */}
            {(mode === "login" || (mode === "signup" && signupStep === 1)) && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google OAuth */}
                <GoogleOAuthButton
                  mode={mode === "signup" ? "signup" : "signin"}
                />
              </>
            )}

            {/* Terms - Only show on signup step 1 */}
            {mode === "signup" && signupStep === 1 && (
              <p className="mt-4 text-xs text-center text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link href="#" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
