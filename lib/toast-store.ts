"use client";

import { create } from "zustand";

export type ToastVariant = "default" | "success" | "error";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastInput = Omit<ToastItem, "id">;

type ToastStore = {
  toasts: ToastItem[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  toast: (input) => {
    const id = `toast-${Math.random().toString(36).slice(2, 8)}`;
    const item: ToastItem = {
      id,
      variant: "default",
      duration: 2800,
      ...input
    };
    set((state) => ({
      toasts: [item, ...state.toasts].slice(0, 6)
    }));

    const timeout = item.duration ?? 2800;
    if (timeout > 0) {
      setTimeout(() => {
        get().dismiss(id);
      }, timeout);
    }
    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
}));

export function useToast() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  return { toast, dismiss };
}
