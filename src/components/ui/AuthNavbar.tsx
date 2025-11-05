/**
 * AuthNavbar - Navigation bar for authentication pages
 * Professional navbar with logo and navigation links
 * Used in: Login and Register pages
 */
"use client";

import Link from "next/link";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AuthNavbarProps {
  currentPage: "login" | "register";
}

export function AuthNavbar({ currentPage }: AuthNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Code2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">VibeIt</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            {currentPage === "login" ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Don&apos;t have an account?
                </span>
                <Link href="/register">
                  <Button variant="outline" size="sm">
                    Sign up
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Already have an account?
                </span>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
