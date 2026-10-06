import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Desk3D } from "@/lib/desk3d/scene";
import { useDeskStore } from "@/store/useDeskStore";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** 이미지 저장 중: 안내·버튼 숨김 */
  hideUi?: boolean;
}

/** 책상 3D 보기. three.js는 처음 켤 때만 불러옴 (2D만 쓰면 받지 않음) */
export function Desk3DView({ selectedId, onSelect, hideUi }: Props) {
  const desk = useDeskStore((s) => s.desk);
  const items = useDeskStore((s) => s.deskItems);
  const hostRef = useRef<View>(null);
  const engine = useRef<Desk3D | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    let cancelled = false;
    import("@/lib/desk3d/scene")
      .then(({ createDesk3D }) => {
        const el = hostRef.current as unknown as HTMLElement | null;
        if (cancelled || !el) return;
        engine.current = createDesk3D(el, { onSelect: (id) => onSelectRef.current(id) });
        const s = useDeskStore.getState();
        engine.current.update({ desk: s.desk, items: s.deskItems, selectedId });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      engine.current?.dispose();
      engine.current = null;
    };
    // 처음 한 번만 만들고, 바뀐 내용은 아래 effect가 전달
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.update({ desk, items, selectedId });
  }, [desk, items, selectedId, status]);

  if (Platform.OS !== "web") {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-zinc-400">3D 보기는 웹과 맥 앱에서 쓸 수 있어요</Text>
      </View>
    );
  }

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <View ref={hostRef} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      {status !== "ready" && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          {status === "loading" ? <ActivityIndicator color="#a5b4fc" /> : <Text className="text-sm text-zinc-400">이 기기에서는 3D를 표시할 수 없어요</Text>}
        </View>
      )}
      {status === "ready" && !hideUi && (
        <>
          <View pointerEvents="none" className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1.5">
            <Text className="text-[11px] text-zinc-300">드래그로 돌리기 · 스크롤로 확대 · 클릭해서 선택</Text>
          </View>
          <Pressable
            onPress={() => engine.current?.resetView()}
            accessibilityRole="button"
            accessibilityLabel="시점 처음으로"
            className="absolute bottom-3 right-3 h-8 flex-row items-center rounded-full border border-white/10 bg-black/55 px-3 active:bg-white/10"
          >
            <Ionicons name="scan-outline" size={14} color="#e4e4e7" />
            <Text className="ml-1 text-xs text-zinc-200">시점 초기화</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
