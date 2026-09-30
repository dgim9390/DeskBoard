import { Platform } from "react-native";
import { supabase } from "./supabase";

/** 일반 웹 주소(http/https)에서 열렸는지. 맥 앱(app://)이면 인증 링크가 앱으로 돌아올 수 없음 */
export const canReturnFromEmailLink = () =>
  Platform.OS === "web" && typeof window !== "undefined" && /^https?:$/.test(window.location.protocol);

/** Supabase 오류 메시지를 사용자용 한국어로 */
export function authErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (/already registered|already been registered/i.test(msg)) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (/Email not confirmed/i.test(msg)) return "이메일 인증이 아직 안 됐어요. 메일함의 인증 링크를 눌러 주세요.";
  if (/Password should be at least/i.test(msg)) return "비밀번호는 6자 이상이어야 해요.";
  if (/invalid.*email|Unable to validate email/i.test(msg)) return "이메일 형식을 확인해 주세요.";
  if (/rate limit|security purposes/i.test(msg)) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (/fetch|network/i.test(msg)) return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
  return msg;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** 가입. 이메일 인증이 켜져 있으면 세션 없이 끝나므로 needsConfirm=true */
export async function signUp(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  // 인증 메일의 링크를 누르면 지금 보고 있는 앱 주소로 돌아오게 함
  // (Supabase 대시보드 Authentication → URL Configuration 의 Redirect URLs 에 이 주소가 허용돼 있어야 함)
  // 맥 앱 등 웹 주소가 아니면 지정하지 않음 → Supabase Site URL(배포 사이트)에서 인증만 완료
  const emailRedirectTo = canReturnFromEmailLink() ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo } });
  if (error) throw error;
  // 이미 가입된 이메일이면 Supabase가 identities 없는 사용자를 돌려줌
  if (data.user && data.user.identities?.length === 0) throw new Error("already registered");
  return { needsConfirm: !data.session };
}

export async function signOut() {
  await supabase.auth.signOut();
}
