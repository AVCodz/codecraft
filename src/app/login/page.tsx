import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/auth?mode=login");
}

export const metadata = {
  title: "Sign In - VibeIt",
  description: "Sign in to your VibeIt account",
};
