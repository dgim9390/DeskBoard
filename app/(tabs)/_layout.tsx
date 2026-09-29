import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
        sceneStyle: { backgroundColor: "#09090b" },
        tabBarStyle: { backgroundColor: "#09090b", borderTopColor: "#27272a" },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#71717a",
      }}
    >
      <Tabs.Screen name="index" options={tab("시뮬레이터", "grid-outline", "grid")} />
      <Tabs.Screen name="recommend" options={tab("추천 기기", "sparkles-outline", "sparkles")} />
      <Tabs.Screen name="setup" options={tab("내 셋업", "desktop-outline", "desktop")} />
    </Tabs>
  );
}
