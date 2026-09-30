import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { authErrorMessage, signIn, signUp } from "@/lib/auth";

export type AuthMode = "login" | "signup";

interface Props {
  visible: boolean;
  initialMode: AuthMode;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 이메일 + 비밀번호 로그인/회원가입 창. 취소/확인은 오른쪽 아래 */
export function AuthModal({ visible, initialMode, onClose }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setPassword("");
      setPassword2("");
      setError(null);
      setNotice(null);
    }
  }, [visible, initialMode]);

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!EMAIL_RE.test(email.trim())) return setError("이메일 형식을 확인해 주세요.");
    if (password.length < 6) return setError("비밀번호는 6자 이상이어야 해요.");
    if (mode === "signup" && password !== password2) return setError("비밀번호가 서로 달라요.");
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        onClose();
      } else {
        const { needsConfirm } = await signUp(email, password);
        if (needsConfirm) {
          setNotice(`${email.trim()}로 인증 메일을 보냈어요. 메일의 링크를 누르면 이 화면으로 돌아와 자동으로 로그인돼요.`);
          setMode("login");
          setPassword("");
          setPassword2("");
        } else {
          onClose(); // 인증 없이 바로 로그인되는 설정
        }
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const input = "mt-2 h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-white";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onClose} accessibilityLabel="닫기">
          <Pressable className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5" onPress={() => {}}>
            {/* 로그인 / 회원가입 전환 */}
            <View className="mb-4 flex-row rounded-lg bg-zinc-950 p-1">
              {(["login", "signup"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === m }}
                  className={`flex-1 items-center rounded-md py-2 ${mode === m ? "bg-zinc-800" : ""}`}
                >
                  <Text className={`text-sm font-semibold ${mode === m ? "text-white" : "text-zinc-500"}`}>{m === "login" ? "로그인" : "회원가입"}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm text-zinc-400">
              {mode === "login" ? "로그인하면 셋업이 계정에 저장돼 어느 기기에서든 불러올 수 있어요." : "이메일과 비밀번호(6자 이상)로 가입해요."}
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              accessibilityLabel="이메일"
              className={`${input} mt-4`}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor="#52525b"
              secureTextEntry
              textContentType={mode === "login" ? "password" : "newPassword"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              accessibilityLabel="비밀번호"
              onSubmitEditing={mode === "login" ? submit : undefined}
              className={input}
            />
            {mode === "signup" && (
              <TextInput
                value={password2}
                onChangeText={setPassword2}
                placeholder="비밀번호 확인"
                placeholderTextColor="#52525b"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                accessibilityLabel="비밀번호 확인"
                onSubmitEditing={submit}
                className={input}
              />
            )}

            {error && <Text className="mt-3 text-sm text-red-400">{error}</Text>}
            {notice && <Text className="mt-3 text-sm leading-5 text-emerald-400">{notice}</Text>}

            <View className="mt-5 flex-row justify-end" style={{ gap: 8 }}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="취소"
                className="rounded-lg border border-zinc-700 px-4 py-2.5 active:bg-zinc-800"
              >
                <Text className="text-sm font-semibold text-zinc-300">취소</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={mode === "login" ? "로그인 확인" : "회원가입 확인"}
                className={`min-w-[64px] items-center rounded-lg bg-indigo-500 px-4 py-2.5 ${busy ? "opacity-60" : "active:bg-indigo-600"}`}
              >
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-sm font-semibold text-white">{mode === "login" ? "로그인" : "가입하기"}</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
