import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/lib/toast";

/** 하단 탭 바로 위에 뜨는 알림. 앱 최상단에 한 번만 둠 */
export function Toast() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: current ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [current, anim]);

  if (!current) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 72,
        alignItems: "center",
      }}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        }}
      >
        {/* Animated.View에는 className이 안 먹으므로 안쪽 View에 스타일 */}
        <View
          className="mx-4 flex-row items-center rounded-2xl border border-white/10 bg-zinc-800 py-2.5 pl-4 pr-2"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          {current.icon && (
            <Ionicons
              name={
                current.icon as React.ComponentProps<typeof Ionicons>["name"]
              }
              size={16}
              color="#a5b4fc"
              style={{ marginRight: 8 }}
            />
          )}
          <Text className="text-sm text-zinc-100" style={{ flexShrink: 1 }}>
            {current.text}
          </Text>
          {current.action && (
            <Pressable
              onPress={() => {
                current.action!.onPress();
                hide();
              }}
              accessibilityRole="button"
              className="ml-3 rounded-lg bg-indigo-500/20 px-3 py-1.5 active:bg-indigo-500/30"
            >
              <Text className="text-sm font-semibold text-indigo-200">
                {current.action.label}
              </Text>
            </Pressable>
          )}
          {!current.action && <View style={{ width: 8 }} />}
        </View>
      </Animated.View>
    </View>
  );
}
