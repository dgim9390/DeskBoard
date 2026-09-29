import { Modal, Pressable, Text, View } from "react-native";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** 되돌릴 수 없는 동작이면 확인 버튼을 빨간색으로 */
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 확인 창. 저장 창과 같은 모양으로 취소/확인은 오른쪽 아래 */
export function ConfirmModal({ visible, title, message, confirmLabel = "확인", destructive, onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onCancel} accessibilityLabel="닫기">
        <Pressable className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5" onPress={() => {}}>
          <Text className="text-lg font-bold text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-zinc-400">{message}</Text>
          <View className="mt-5 flex-row justify-end" style={{ gap: 8 }}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="취소"
              className="rounded-lg border border-zinc-700 px-4 py-2.5 active:bg-zinc-800"
            >
              <Text className="text-sm font-semibold text-zinc-300">취소</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              className={`rounded-lg px-4 py-2.5 ${destructive ? "bg-red-500 active:bg-red-600" : "bg-indigo-500 active:bg-indigo-600"}`}
            >
              <Text className="text-sm font-semibold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
