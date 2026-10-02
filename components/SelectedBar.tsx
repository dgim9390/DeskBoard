import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MIN_ITEM_CM, defaultColor, findPartner, reorderTarget, useDeskStore, type DeskItem, type ItemColor } from "@/store/useDeskStore";
import { SizeFields } from "./SizeFields";

const COLORS: { value: ItemColor; label: string; fill: string }[] = [
  { value: "black", label: "블랙", fill: "#18181b" },
  { value: "white", label: "화이트", fill: "#f4f4f5" },
];

function Chip({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`mr-2 flex-row items-center rounded-lg border border-zinc-700 px-2.5 py-1.5 ${disabled ? "opacity-35" : "active:bg-zinc-800"}`}
    >
      <Ionicons name={icon} size={14} color="#d4d4d8" />
      <Text className="ml-1 text-xs text-zinc-300">{label}</Text>
    </Pressable>
  );
}

interface Props {
  item: DeskItem;
  /** 삭제 (되돌리기 알림은 부모가) */
  onDelete: () => void;
  onDuplicate: () => void;
  /** 결합으로 선택 대상 id가 바뀔 때 */
  onSelect: (id: string) => void;
}

/** 선택한 장비의 색상 / 크기(cm) 입력 / 회전 / 삭제 / 앞뒤 배치 / 결합·분리 */
export function SelectedBar({ item, onDelete, onDuplicate, onSelect }: Props) {
  const updateItemSize = useDeskStore((s) => s.updateItemSize);
  const updateItemRotation = useDeskStore((s) => s.updateItemRotation);
  const setItemColor = useDeskStore((s) => s.setItemColor);
  const detachMount = useDeskStore((s) => s.detachMount);
  const mountNearest = useDeskStore((s) => s.mountNearest);
  const reorder = useDeskStore((s) => s.reorder);
  const deskItems = useDeskStore((s) => s.deskItems);
  const partner = findPartner(deskItems, item);
  const canForward = reorderTarget(deskItems, item.id, "forward") >= 0;
  const canBackward = reorderTarget(deskItems, item.id, "backward") >= 0;
  const color = item.color ?? defaultColor(item.kind);

  return (
    <View className="mb-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
      <View className="flex-row items-center">
        <View className="mr-2 flex-1">
          <Text className="text-sm font-semibold text-zinc-100" numberOfLines={1}>
            {item.name}
          </Text>
          {item.mount && (
            <Text className="text-[11px] text-indigo-300" numberOfLines={1}>
              + {item.mount.name} 결합됨
            </Text>
          )}
          {!item.mount && item.site && (
            <Text className="text-[11px] text-zinc-500" numberOfLines={1}>
              {item.site}
            </Text>
          )}
        </View>
        {/* 사진으로 표시하는 제품은 색상 선택 없음 */}
        {item.kind !== "photo" && COLORS.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => setItemColor(item.id, c.value)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${c.label} 색상`}
            accessibilityState={{ selected: color === c.value }}
            className="ml-1.5 h-8 w-8 items-center justify-center rounded-full"
            style={{ borderWidth: 2, borderColor: color === c.value ? "#818cf8" : "transparent" }}
          >
            <View className="h-5 w-5 rounded-full" style={{ backgroundColor: c.fill, borderWidth: 1, borderColor: "#52525b" }} />
          </Pressable>
        ))}
      </View>

      <View className="mt-2 flex-row items-center">
        <SizeFields
          w={item.width}
          h={item.height}
          min={{ w: MIN_ITEM_CM, h: MIN_ITEM_CM }}
          onChange={(w, h) => updateItemSize(item.id, w, h)}
          resetKey={item.id}
        />
        <View className="flex-1" />
        <Pressable
          onPress={() => updateItemRotation(item.id, item.rotation + 90)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="90도 회전"
          className="h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/90 active:bg-indigo-600"
        >
          <Ionicons name="refresh" size={18} color="white" />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="삭제"
          className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-red-500/90 active:bg-red-600"
        >
          <Ionicons name="trash" size={18} color="white" />
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-center" style={{ flexWrap: "wrap", rowGap: 6 }}>
        <Chip icon="copy-outline" label="복제" onPress={onDuplicate} />
        <Chip icon="arrow-down" label="뒤로" onPress={() => reorder(item.id, "backward")} disabled={!canBackward} />
        <Chip icon="arrow-up" label="앞으로" onPress={() => reorder(item.id, "forward")} disabled={!canForward} />
        {item.mount ? (
          <Chip icon="unlink" label={`${item.mount.name} 분리`} onPress={() => detachMount(item.id)} />
        ) : partner ? (
          <Chip
            icon="link"
            label={`${partner.host.id === item.id ? partner.acc.name : partner.host.name}에 결합`}
            onPress={() => onSelect(mountNearest(item.id))}
          />
        ) : null}
        {item.link && <Chip icon="open-outline" label="제품 페이지" onPress={() => Linking.openURL(item.link!)} />}
      </View>
    </View>
  );
}
