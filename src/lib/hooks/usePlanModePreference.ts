"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vibeit-plan-mode";

function readStoredPreference(defaultValue: boolean) {
  if (typeof window === "undefined") return defaultValue;
  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (storedValue === null) return defaultValue;
  return storedValue === "true";
}

export function usePlanModePreference(defaultValue = false) {
  const [isPlanMode, setIsPlanMode] = useState<boolean>(() =>
    readStoredPreference(defaultValue)
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        setIsPlanMode(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updatePreference = useCallback((nextValue: boolean) => {
    setIsPlanMode(nextValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(nextValue));
    }
  }, []);

  return [isPlanMode, updatePreference] as const;
}
