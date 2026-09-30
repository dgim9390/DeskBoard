import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { useDeskStore } from "@/store/useDeskStore";
import { AuthModal, type AuthMode } from "./AuthModal";
import { ConfirmModal } from "./ConfirmModal";

/** 헤더 왼쪽: 로그아웃 상태면 로그인/회원가입, 로그인 상태면 계정 표시 + 로그아웃 */
export function AuthButton() {
  const user = useDeskStore((s) => s.user);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

  if (!supabaseConfigured) return null;

  const pill = "flex-row items-center rounded-lg px-2.5 py-1.5";

  return (
    <View className="ml-4 flex-row items-center" style={{ gap: 6 }}>
      {user ? (
        <>
          <View className="h-7 w-7 items-center justify-center rounded-full bg-indigo-500/30" accessibilityLabel={`${user.email}로 로그인됨`}>
            <Text className="text-xs font-bold text-indigo-200">{user.email.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Pressable onPress={() => setConfirmOut(true)} accessibilityRole="button" accessibilityLabel="로그아웃" hitSlop={6} className={`${pill} border border-zinc-700 active:bg-zinc-800`}>
            <Ionicons name="log-out-outline" size={14} color="#d4d4d8" />
            <Text className="ml-1 text-xs font-semibold text-zinc-300">로그아웃</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable onPress={() => setMode("login")} accessibilityRole="button" accessibilityLabel="로그인" hitSlop={6} className={`${pill} border border-zinc-700 active:bg-zinc-800`}>
            <Text className="text-xs font-semibold text-zinc-200">로그인</Text>
          </Pressable>
          <Pressable onPress={() => setMode("signup")} accessibilityRole="button" accessibilityLabel="회원가입" hitSlop={6} className={`${pill} bg-zinc-800 active:bg-zinc-700`}>
            <Text className="text-xs font-semibold text-zinc-200">회원가입</Text>
          </Pressable>
        </>
      )}

      <AuthModal visible={mode !== null} initialMode={mode ?? "login"} onClose={() => setMode(null)} />
      <ConfirmModal
        visible={confirmOut}
        title="로그아웃"
        message={`${user?.email ?? ""} 계정에서 로그아웃할까요? 저장한 셋업은 계정에 남아 있어서 다시 로그인하면 불러올 수 있어요.`}
        confirmLabel="로그아웃"
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          setConfirmOut(false);
          signOut();
        }}
      />
    </View>
  );
}
