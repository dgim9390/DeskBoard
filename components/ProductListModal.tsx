import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DeskItem } from "@/store/useDeskStore";

/**
 * 구매 링크: 링크로 추가한 제품은 그 제품 페이지, 기본 제품은 쿠팡 검색.
 * shortcut: 제휴(쿠팡 파트너스) 링크가 아님. 파트너스 승인 후 이 함수에서 제휴 링크로 바꾸면 목록 전체에 적용됨
 */
export function buyUrl(name: string, link?: string) {
  return link ?? `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`;
}

/** 셋업에 들어간 제품 목록 (결합된 모니터 암·받침대도 따로 한 줄) */
export function ProductListModal({ visible, items, onClose }: { visible: boolean; items: DeskItem[]; onClose: () => void }) {
  const rows = items.flatMap((i) => [
    { key: i.id, name: i.name, size: `${i.width}×${i.height}cm`, link: i.link, site: i.site },
    ...(i.mount ? [{ key: `${i.id}-mount`, name: i.mount.name, size: `${i.mount.width}×${i.mount.height}cm`, link: undefined, site: undefined }] : []),
  ]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onClose} accessibilityLabel="닫기">
        <Pressable className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900" style={{ maxHeight: "85%" }} onPress={() => {}}>
          <View className="flex-row items-center border-b border-zinc-800 px-5 py-4">
            <Text className="flex-1 text-lg font-bold text-white">이 셋업의 제품 {rows.length}개</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={20} color="#a1a1aa" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}>
            {rows.length === 0 && <Text className="py-6 text-center text-sm text-zinc-500">책상에 제품이 없어요</Text>}
            {rows.map((r) => (
              <View key={r.key} className="flex-row items-center border-b border-zinc-800/70 py-3">
                <View className="mr-3 flex-1">
                  <Text className="text-sm font-semibold text-zinc-100" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-zinc-500" numberOfLines={1}>
                    {r.size}
                    {r.site ? ` · ${r.site}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(buyUrl(r.name, r.link))}
                  accessibilityRole="link"
                  accessibilityLabel={`${r.name} ${r.link ? "제품 페이지" : "쿠팡에서 찾기"}`}
                  className="flex-row items-center rounded-lg bg-indigo-500 px-3 py-1.5 active:bg-indigo-600"
                >
                  <Ionicons name={r.link ? "open-outline" : "cart-outline"} size={14} color="#fff" />
                  <Text className="ml-1 text-xs font-semibold text-white">{r.link ? "제품 페이지" : "쿠팡에서 찾기"}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
