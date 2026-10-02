import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SetupPreview } from "@/components/SetupPreview";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/data/catalog";
import { confirm } from "@/lib/confirm";
import { eulReul } from "@/lib/josa";
import { defaultColor, sameLayout, useDeskStore, type SavedSetup } from "@/store/useDeskStore";

const fmtDate = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function Btn({ icon, label, onPress, tone = "default" }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; tone?: "primary" | "default" | "danger" }) {
  const cls = tone === "primary" ? "bg-indigo-500 active:bg-indigo-600" : tone === "danger" ? "border border-zinc-700 active:bg-zinc-800" : "border border-zinc-700 active:bg-zinc-800";
  const color = tone === "primary" ? "#fff" : tone === "danger" ? "#f87171" : "#d4d4d8";
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={`flex-row items-center rounded-lg px-3 py-2 ${cls}`}>
      <Ionicons name={icon} size={15} color={color} />
      <Text className="ml-1 text-sm font-semibold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SetupScreen() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const desk = useDeskStore((s) => s.desk);
  const deskItems = useDeskStore((s) => s.deskItems);
  const savedSetups = useDeskStore((s) => s.savedSetups);
  const activeSetupId = useDeskStore((s) => s.activeSetupId);
  const user = useDeskStore((s) => s.user);
  const cloudLoading = useDeskStore((s) => s.cloudLoading);
  const syncError = useDeskStore((s) => s.syncError);
  const { removeItem, saveSetup, overwriteSetup, loadSetup, deleteSetup, renameSetup } = useDeskStore.getState();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const active = savedSetups.find((x) => x.id === activeSetupId);
  const current = { desk, items: deskItems };
  const dirty = !active || !sameLayout(current, active);
  const hasUnsaved = deskItems.length > 0 && dirty && !savedSetups.some((x) => sameLayout(current, x));

  const onLoad = (x: SavedSetup) => {
    const go = () => {
      loadSetup(x.id);
      router.navigate("/");
    };
    if (hasUnsaved) confirm("셋업 불러오기", `저장하지 않은 현재 배치는 사라져요. ${eulReul(`'${x.name}'`)} 불러올까요?`, "불러오기", go);
    else go();
  };

  const previewW = Math.min(screenW - 64, 420);

  const header = (
    <View>
      {/* 저장 위치 안내 */}
      <View className={`mb-3 flex-row items-center rounded-xl px-3 py-2.5 ${user ? "bg-emerald-500/10" : "bg-zinc-900"}`}>
        <Ionicons name={user ? "cloud-done-outline" : "phone-portrait-outline"} size={16} color={user ? "#6ee7b7" : "#a1a1aa"} />
        <Text className={`ml-2 flex-1 text-xs leading-4 ${user ? "text-emerald-300" : "text-zinc-400"}`}>
          {user
            ? `${user.email} 계정에 저장돼요. 다른 기기에서도 로그인하면 불러올 수 있어요.`
            : "지금은 이 기기에만 저장돼요. 왼쪽 위에서 로그인하면 계정에 저장돼요."}
        </Text>
        {cloudLoading && <ActivityIndicator size="small" color="#6ee7b7" />}
      </View>
      {syncError && (
        <View className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5">
          <Text className="text-xs leading-4 text-red-300">{syncError}</Text>
        </View>
      )}

      {/* 현재 배치 + 저장 */}
      <View className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm text-zinc-400">현재 배치</Text>
            <Text className="mt-1 text-3xl font-bold text-white">장비 {deskItems.length}개</Text>
            <Text className="mt-1 text-xs text-zinc-500">
              책상 {desk.width}×{desk.depth}cm
            </Text>
          </View>
        </View>
        {active && (
          <Text className={`mt-2 text-xs ${dirty ? "text-amber-400" : "text-emerald-400"}`}>
            {dirty ? `'${active.name}'에서 변경된 내용이 있어요` : `'${active.name}'에 저장된 상태예요`}
          </Text>
        )}
        <View className="mt-3 flex-row items-center">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={`셋업 ${savedSetups.length + 1}`}
            placeholderTextColor="#52525b"
            className="mr-2 h-10 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
            accessibilityLabel="셋업 이름"
            returnKeyType="done"
            onSubmitEditing={() => {
              saveSetup(name);
              setName("");
            }}
          />
          <Btn
            icon="save-outline"
            label="새로 저장"
            tone="primary"
            onPress={() => {
              saveSetup(name);
              setName("");
            }}
          />
        </View>
        {active && dirty && (
          <View className="mt-2 flex-row">
            <Btn icon="refresh" label={`'${active.name}'에 덮어쓰기`} onPress={() => overwriteSetup(active.id)} />
          </View>
        )}
      </View>

      {/* 저장된 셋업 */}
      <Text className="mb-2 text-base font-bold text-zinc-100">저장된 셋업 {savedSetups.length > 0 ? savedSetups.length : ""}</Text>
      {savedSetups.length === 0 && (
        <View className="mb-4 items-center rounded-2xl border border-dashed border-zinc-800 py-8">
          <Ionicons name="albums-outline" size={28} color="#52525b" />
          <Text className="mt-2 text-sm text-zinc-500">아직 저장한 셋업이 없어요. 위에서 현재 배치를 저장해 보세요.</Text>
        </View>
      )}
      {savedSetups.map((x) => {
        const isActive = x.id === activeSetupId;
        return (
          <View key={x.id} className={`mb-3 rounded-2xl border p-3 ${isActive ? "border-indigo-500/60 bg-indigo-500/5" : "border-zinc-800 bg-zinc-900"}`}>
            <View className="mb-2 flex-row items-center">
              {editing?.id === x.id ? (
                <TextInput
                  autoFocus
                  value={editing.name}
                  onChangeText={(t) => setEditing({ id: x.id, name: t })}
                  onBlur={() => {
                    renameSetup(x.id, editing.name);
                    setEditing(null);
                  }}
                  onSubmitEditing={() => {
                    renameSetup(x.id, editing.name);
                    setEditing(null);
                  }}
                  className="mr-2 h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-base text-white"
                  accessibilityLabel="셋업 이름 수정"
                />
              ) : (
                <Pressable className="mr-2 flex-1 flex-row items-center" onPress={() => setEditing({ id: x.id, name: x.name })} accessibilityLabel={`${x.name} 이름 수정`}>
                  <Text className="text-base font-semibold text-zinc-100" numberOfLines={1}>
                    {x.name}
                  </Text>
                  <Ionicons name="pencil" size={12} color="#71717a" style={{ marginLeft: 6 }} />
                </Pressable>
              )}
              {isActive && (
                <View className="rounded-full bg-indigo-500/20 px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-indigo-300">사용 중</Text>
                </View>
              )}
            </View>
            <SetupPreview desk={x.desk} items={x.items} width={previewW} />
            <Text className="mt-2 text-xs text-zinc-500">
              {fmtDate(x.savedAt)} · 장비 {x.items.length}개 · {x.desk.width}×{x.desk.depth}cm
            </Text>
            <View className="mt-2 flex-row" style={{ gap: 8 }}>
              <Btn icon="open-outline" label="불러오기" tone="primary" onPress={() => onLoad(x)} />
              <Btn
                icon="refresh"
                label="덮어쓰기"
                onPress={() => confirm("덮어쓰기", `${eulReul(`'${x.name}'`)} 현재 배치로 바꿀까요?`, "덮어쓰기", () => overwriteSetup(x.id))}
              />
              <View className="flex-1" />
              <Btn icon="trash-outline" label="삭제" tone="danger" onPress={() => confirm("셋업 삭제", `${eulReul(`'${x.name}'`)} 삭제할까요?`, "삭제", () => deleteSetup(x.id), true)} />
            </View>
          </View>
        );
      })}

      <Text className="mb-2 mt-3 text-base font-bold text-zinc-100">현재 배치된 장비</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-zinc-950">
      <FlatList
        data={deskItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text className="py-10 text-center text-zinc-500">배치된 장비가 없어요.</Text>}
        renderItem={({ item }) => (
          <View className="flex-row items-center rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <View className="mr-3 h-10 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[item.category] }} />
            <View className="flex-1">
              <Text className="font-semibold text-zinc-100">
                {item.name}
                {item.mount ? ` + ${item.mount.name}` : ""}
              </Text>
              <Text className="text-xs text-zinc-500">
                {CATEGORY_LABEL[item.category]} · {(item.color ?? defaultColor(item.kind)) === "white" ? "화이트" : "블랙"}
              </Text>
            </View>
            <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
              <Text className="text-sm text-red-400">삭제</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
