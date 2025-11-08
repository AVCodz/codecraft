import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/auth?mode=signup");
}

export const metadata = {
  title: "Sign Up - VibeIt",
  description: "Create your VibeIt account",
};
