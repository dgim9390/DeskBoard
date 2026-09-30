import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** .env 가 없으면 로그인 기능만 꺼지고 앱은 기기 저장으로 동작 */
export const supabaseConfigured = !!url && !!key;

export const supabase = createClient(url ?? "https://invalid.supabase.co", key ?? "invalid", {
  auth: {
    storage: AsyncStorage, // 로그인 상태를 기기에 보관 (웹은 localStorage)
    autoRefreshToken: true,
    persistSession: true,
    // 웹: 인증 메일 링크로 돌아왔을 때 주소에 담긴 로그인 정보를 읽어 자동 로그인
    detectSessionInUrl: Platform.OS === "web",
  },
});

// 네이티브: 앱이 화면에 있을 때만 토큰 자동 갱신 (Supabase 권장 설정)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
