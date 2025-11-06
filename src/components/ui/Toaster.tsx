"use client";

import { Toaster as HotToaster } from "react-hot-toast";
import { useUIStore } from "@/lib/stores/uiStore";

export function Toaster() {
  const { theme } = useUIStore();
  const isDark = theme === "brilliance-black";

  return (
    <HotToaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 3000,
        style: {
          background: isDark ? "#1f2937" : "#ffffff",
          color: isDark ? "#fff" : "#000",
          border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          padding: "12px 16px",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: isDark ? "#1f2937" : "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: isDark ? "#1f2937" : "#ffffff",
          },
        },
      }}
    />
  );
}
