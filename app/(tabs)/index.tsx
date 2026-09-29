import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DeskBar } from "@/components/DeskBar";
import { DeskCanvas } from "@/components/DeskCanvas";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ItemPicker } from "@/components/ItemPicker";
import { SaveSetupModal } from "@/components/SaveSetupModal";
import { SelectedBar } from "@/components/SelectedBar";
import type { CATALOG } from "@/data/catalog";
import { suggestPosition } from "@/lib/placement";
import { useDeskStore } from "@/store/useDeskStore";

export default function SimulatorScreen() {
  const addDeskItem = useDeskStore((s) => s.addDeskItem);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useDeskStore((s) => s.deskItems.find((i) => i.id === selectedId));
  const savedCount = useDeskStore((s) => s.savedSetups.length);
  const saveSetup = useDeskStore((s) => s.saveSetup);
  const clearDesk = useDeskStore((s) => s.clearDesk);
  const itemCount = useDeskStore((s) => s.deskItems.length);
  const [clearOpen, setClearOpen] = useState(false);
  const navigation = useNavigation();
  const [saveOpen, setSaveOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // 오른쪽 상단 저장 버튼
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="mr-4 flex-row items-center" style={{ gap: 8 }}>
          {/* 책상 비우기: 잘못 누를 수 있어 확인 창을 거침 */}
          <Pressable
            onPress={() => setClearOpen(true)}
            disabled={itemCount === 0}
            accessibilityRole="button"
            accessibilityLabel="책상 비우기"
            accessibilityState={{ disabled: itemCount === 0 }}
            hitSlop={8}
            className={`flex-row items-center rounded-lg border border-zinc-700 px-3 py-1.5 ${itemCount === 0 ? "opacity-35" : "active:bg-zinc-800"}`}
          >
            <Ionicons name="trash-outline" size={15} color="#f87171" />
            <Text className="ml-1 text-sm font-semibold text-red-400">비우기</Text>
          </Pressable>
          <Pressable
          onPress={() => setSaveOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="현재 배치 저장"
          hitSlop={8}
          className={`flex-row items-center rounded-lg px-3 py-1.5 ${justSaved ? "bg-emerald-500/20" : "bg-indigo-500 active:bg-indigo-600"}`}
        >
          <Ionicons name={justSaved ? "checkmark" : "save-outline"} size={15} color={justSaved ? "#6ee7b7" : "#fff"} />
          <Text className={`ml-1 text-sm font-semibold ${justSaved ? "text-emerald-300" : "text-white"}`}>{justSaved ? "저장됨" : "저장"}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, justSaved, itemCount]);

  // "저장됨" 표시는 잠깐만
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handlePick = useCallback(
    ({ key: _key, group: _group, ...entry }: (typeof CATALOG)[number]) => {
      const { desk, deskItems } = useDeskStore.getState();
      // 제품별 자연스러운 자리(모니터 앞, 키보드 옆 등)에서 다른 제품과 겹치지 않는 곳에 놓음
      const pos = suggestPosition(entry.kind!, entry, deskItems, desk);
      setSelectedId(addDeskItem({ ...entry, ...pos }));
    },
    [addDeskItem],
  );

  return (
    <View className="flex-1 bg-zinc-950 px-3 pb-3 pt-2">
      {/* 상단: 캔버스 (남는 공간 전부) */}
      <View style={{ flex: 1 }}>
        <DeskCanvas selectedId={selectedId} onSelect={setSelectedId} />
      </View>
      {/* 하단: 선택/책상 바 + 장비 리스트 (내용 높이만큼) */}
      <View className="pt-3">
        {selectedItem ? <SelectedBar item={selectedItem} onDeleted={() => setSelectedId(null)} onSelect={setSelectedId} /> : <DeskBar />}
        <ItemPicker onPick={handlePick} />
      </View>

      <ConfirmModal
        visible={clearOpen}
        title="책상 비우기"
        message={`책상 위 장비 ${itemCount}개를 모두 지울까요? 저장하지 않은 배치는 되돌릴 수 없어요.`}
        confirmLabel="비우기"
        destructive
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          clearDesk();
          setSelectedId(null);
          setClearOpen(false);
        }}
      />

      <SaveSetupModal
        visible={saveOpen}
        defaultName={`셋업 ${savedCount + 1}`}
        onCancel={() => setSaveOpen(false)}
        onConfirm={(name) => {
          saveSetup(name);
          setSaveOpen(false);
          setJustSaved(true);
        }}
      />
    </View>
  );
}
