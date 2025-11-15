/**
 * Navbar - Landing page navigation bar
 * Top navigation with logo, links, and authentication controls
 * Features: Mobile menu, user dropdown, authentication state, responsive design
 * Used in: Landing page and public pages
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Menu, X, LogOut, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { Logo } from "@/components/ui/icon/logo";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, signOut, checkAuth } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Scroll detection for backdrop blur effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    router.push("/");
  };

  // Get user initials from name or email
  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "backdrop-blur-md " : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex justify-center items-center group gap-2 text-foreground  transition-colors"
          >
            <Logo size={32} className="text-primary group-hover:opacity-85" />
            <span className="text-2xl font-brand group-hover:text-foreground/80">
              VibeIt
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {isAuthenticated && user ? (
              <Dropdown
                align="right"
                trigger={
                  <button
                    className="flex justify-center text-center items-center gap-2 hover:bg-muted/40 p-2 rounded-lg transition-colors cursor-pointer"
                    title={user.email}
                  >
                    <span className="text-center flex justify-center items-center h-10 w-10 rounded-lg bg-accent text-white transition-colors font-semibold text-lg">
                      {getUserInitial()}
                    </span>
                    <span className="font-semibold text-lg">{user.name}</span>
                  </button>
                }
              >
                {/* User Info */}
                <div className="px-3 py-2 border-b border-border bg-muted/50 -mx-1 mb-1">
                  <p className="text-sm font-medium">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>

                <DropdownItem onClick={() => router.push("/settings")}>
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onClick={handleSignOut} variant="destructive">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownItem>
              </Dropdown>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth?mode=login">
                  <Button variant="ghost" className="cursor-pointer">
                    Login
                  </Button>
                </Link>
                <Link href="/auth?mode=signup">
                  <Button className="cursor-pointer">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-foreground cursor-pointer"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-in">
            <div className="flex flex-col gap-4">
              {isAuthenticated && user ? (
                <>
                  {/* User Info */}
                  <div className="px-3 py-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold text-lg">
                        {getUserInitial()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {user.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start cursor-pointer"
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push("/settings");
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive cursor-pointer"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    href="/auth?mode=login"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button variant="ghost" className="w-full cursor-pointer">
                      Login
                    </Button>
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="w-full cursor-pointer">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
