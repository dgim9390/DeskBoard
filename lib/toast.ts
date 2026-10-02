import { create } from "zustand";

/** 화면 아래에 잠깐 뜨는 알림 (예: "템플릿을 적용했어요 · 되돌리기") */
export interface ToastMessage {
  id: number;
  text: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
}

interface ToastState {
  current: ToastMessage | null;
  show: (text: string, opts?: { icon?: string; action?: ToastMessage["action"]; duration?: number }) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (text, opts = {}) => {
    if (timer) clearTimeout(timer);
    const msg: ToastMessage = { id: ++seq, text, icon: opts.icon, action: opts.action };
    set({ current: msg });
    timer = setTimeout(() => set((s) => (s.current?.id === msg.id ? { current: null } : s)), opts.duration ?? (opts.action ? 4500 : 2200));
  },
  hide: () => set({ current: null }),
}));

export const toast = (...args: Parameters<ToastState["show"]>) => useToast.getState().show(...args);
