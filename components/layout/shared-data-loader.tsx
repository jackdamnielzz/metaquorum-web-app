"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function SharedDataLoader() {
  const loadShared = useAppStore((state) => state.loadShared);

  useEffect(() => {
    void loadShared();
  }, [loadShared]);

  return null;
}
