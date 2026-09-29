import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

interface Props {
  visible: boolean;
  /** 이름을 비워두면 쓰일 기본 이름 */
  defaultName: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

/** 현재 배치를 저장할 때 이름을 입력받는 창. 취소/확인은 오른쪽 아래 */
export function SaveSetupModal({ visible, defaultName, onCancel, onConfirm }: Props) {
  const [name, setName] = useState("");

  // 열릴 때마다 입력칸 초기화
  useEffect(() => {
    if (visible) setName("");
  }, [visible]);

  const submit = () => onConfirm(name.trim() || defaultName);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onCancel} accessibilityLabel="닫기">
          {/* 카드 안쪽 탭은 닫기로 전달되지 않게 */}
          <Pressable className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5" onPress={() => {}}>
            <Text className="text-lg font-bold text-white">셋업 저장</Text>
            <Text className="mt-1 text-sm text-zinc-400">현재 배치를 어떤 이름으로 저장할까요?</Text>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder={defaultName}
              placeholderTextColor="#52525b"
              returnKeyType="done"
              onSubmitEditing={submit}
              maxLength={30}
              accessibilityLabel="저장할 셋업 이름"
              className="mt-4 h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-white"
            />
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
                onPress={submit}
                accessibilityRole="button"
                accessibilityLabel="확인"
                className="rounded-lg bg-indigo-500 px-4 py-2.5 active:bg-indigo-600"
              >
                <Text className="text-sm font-semibold text-white">확인</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
