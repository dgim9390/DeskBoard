import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthButton } from "@/components/AuthButton";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tab = (title: string, icon: IconName, focusedIcon: IconName) => ({
  title,
  tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? focusedIcon : icon} size={size} color={color} />
  ),
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#09090b" },
        headerTintColor: "#fafafa",
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerLeft: () => <AuthButton />, // 왼쪽 위: 로그인/회원가입 · 로그아웃
        sceneStyle: { backgroundColor: "#09090b" },
        tabBarStyle: { backgroundColor: "#09090b", borderTopColor: "#27272a" },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#71717a",
      }}
    >
      <Tabs.Screen
        name="index"
        // 오른쪽에 비우기·저장 버튼이 있어 제목은 숨김 (하단 탭에 이름 표시)
        options={{ ...tab("시뮬레이터", "grid-outline", "grid"), headerTitle: "" }}
      />
      <Tabs.Screen name="recommend" options={tab("추천 기기", "sparkles-outline", "sparkles")} />
      <Tabs.Screen name="setup" options={tab("내 셋업", "desktop-outline", "desktop")} />
    </Tabs>
  );
}
