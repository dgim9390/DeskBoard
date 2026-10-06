import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DeskBar } from "@/components/DeskBar";
import { DeskCanvas } from "@/components/DeskCanvas";
import { AddProductModal } from "@/components/AddProductModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ItemPicker } from "@/components/ItemPicker";
import { SaveSetupModal } from "@/components/SaveSetupModal";
import { SelectedBar } from "@/components/SelectedBar";
import type { CATALOG } from "@/data/catalog";
import { eulReul } from "@/lib/josa";
import { suggestPosition } from "@/lib/placement";
import { toast } from "@/lib/toast";
import { useDeskStore, type CustomProduct } from "@/store/useDeskStore";

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
  }, [navigation, justSaved]);

  // "저장됨" 표시는 잠깐만
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [justSaved]);

  // ── 되돌리기 알림 ──
  const undoToast = (text: string, icon: string) => toast(text, { icon, action: { label: "되돌리기", onPress: () => useDeskStore.getState().undo() } });

  const duplicate = useCallback((id: string) => {
    const newId = useDeskStore.getState().duplicateItem(id);
    if (newId) {
      setSelectedId(newId);
      toast("복제했어요", { icon: "copy-outline" });
    }
  }, []);

  const remove = useCallback((id: string) => {
    const item = useDeskStore.getState().deskItems.find((i) => i.id === id);
    useDeskStore.getState().removeItem(id);
    setSelectedId(null);
    if (item) undoToast(`${eulReul(`'${item.name}'`)} 지웠어요`, "trash-outline");
  }, []);

  // ── 단축키 (웹·맥 앱) ──
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return; // 입력 중엔 무시
      const mod = e.metaKey || e.ctrlKey;
      const st = useDeskStore.getState();
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        st.redo();
      } else if (mod && key === "s") {
        e.preventDefault();
        setSaveOpen(true);
      } else if (mod && key === "d" && selectedId) {
        e.preventDefault();
        duplicate(selectedId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        remove(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (selectedId && e.key.startsWith("Arrow")) {
        // 화살표: 1cm, Shift+화살표: 5cm
        const item = st.deskItems.find((i) => i.id === selectedId);
        if (!item) return;
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        st.updateItemPosition(item.id, item.x + dx, item.y + dy);
      }
    };
    window.addEventListener("keydown", onKey);
    // 맥 앱 메뉴(편집 → 실행 취소/복귀)에서 보내는 신호
    const onUndo = () => useDeskStore.getState().undo();
    const onRedo = () => useDeskStore.getState().redo();
    window.addEventListener("deskterior:undo", onUndo);
    window.addEventListener("deskterior:redo", onRedo);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("deskterior:undo", onUndo);
      window.removeEventListener("deskterior:redo", onRedo);
    };
  }, [selectedId, duplicate, remove]);

  const handlePick = useCallback(
    ({ key: _key, group: _group, ...entry }: (typeof CATALOG)[number]) => {
      const { desk, deskItems } = useDeskStore.getState();
      // 제품별 자연스러운 자리(모니터 앞, 키보드 옆 등)에서 다른 제품과 겹치지 않는 곳에 놓음
      const pos = suggestPosition(entry.kind!, entry, deskItems, desk);
      setSelectedId(addDeskItem({ ...entry, ...pos }));
    },
    [addDeskItem],
  );

  // ── 링크로 추가한 "내 제품" ──
  const addCustomProduct = useDeskStore((s) => s.addCustomProduct);
  const removeCustomProduct = useDeskStore((s) => s.removeCustomProduct);
  const [linkOpen, setLinkOpen] = useState(false);
  const [removing, setRemoving] = useState<CustomProduct | null>(null);

  const placeCustom = useCallback(
    (p: Omit<CustomProduct, "id" | "createdAt">) => {
      const { desk, deskItems } = useDeskStore.getState();
      const pos = suggestPosition(p.kind, p, deskItems, desk);
      setSelectedId(
        addDeskItem({
          name: p.name,
          category: p.category,
          kind: p.kind,
          color: p.color,
          width: p.width,
          height: p.height,
          price: p.price ?? 0,
          imageUrl: p.imageUrl,
          link: p.link,
          site: p.site,
          tall: p.tall,
          ...pos,
        }),
      );
    },
    [addDeskItem],
  );

  return (
    <View className="flex-1 bg-zinc-950 px-3 pb-3 pt-2">
      {/* 상단: 캔버스 (남는 공간 전부) */}
      <View style={{ flex: 1 }}>
        <DeskCanvas selectedId={selectedId} onSelect={setSelectedId} onRequestClear={() => setClearOpen(true)} />
      </View>
      {/* 하단: 선택/책상 바 + 장비 리스트 (내용 높이만큼) */}
      <View className="pt-3">
        {selectedItem ? (
          <SelectedBar item={selectedItem} onDelete={() => remove(selectedItem.id)} onDuplicate={() => duplicate(selectedItem.id)} onSelect={setSelectedId} />
        ) : (
          <DeskBar />
        )}
        <ItemPicker onPick={handlePick} onPickCustom={placeCustom} onAddLink={() => setLinkOpen(true)} onRemoveCustom={setRemoving} />
      </View>

      <AddProductModal
        visible={linkOpen}
        onClose={() => setLinkOpen(false)}
        onAdd={(p) => {
          addCustomProduct(p); // "내 제품"에 보관해 다시 쓸 수 있게
          placeCustom(p);
          setLinkOpen(false);
        }}
      />

      <ConfirmModal
        visible={removing !== null}
        title="내 제품에서 삭제"
        message={`${eulReul(`'${removing?.name ?? ""}'`)} 내 제품 목록에서 지울까요? 이미 책상에 놓인 제품은 그대로 남아요.`}
        confirmLabel="삭제"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) removeCustomProduct(removing.id);
          setRemoving(null);
        }}
      />

      <ConfirmModal
        visible={clearOpen}
        title="책상 비우기"
        message={`책상 위 장비 ${itemCount}개를 모두 지울까요? 바로 뒤에 되돌리기로 복구할 수 있어요.`}
        confirmLabel="비우기"
        destructive
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          clearDesk();
          setSelectedId(null);
          setClearOpen(false);
          undoToast("책상을 비웠어요", "trash-outline");
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
