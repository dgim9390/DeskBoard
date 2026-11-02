import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** 기능 안내: 저장 버튼 옆 ? 버튼으로 엶 */
const SECTIONS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; lines: string[] }[] = [
  {
    icon: "grid-outline",
    title: "배치하기",
    lines: [
      "오른쪽 '장비 추가'에서 제품을 눌러 책상에 놓아요.",
      "제품을 끌어서 옮기고, 아래 막대에서 크기(cm)와 회전을 바꿔요.",
      "책상 양옆과 앞쪽 바닥(점선 안)에도 놓을 수 있어요. 3D에서는 바닥에 놓여요.",
      "뒤로 · 앞으로: 겹친 제품의 위아래 순서. 받침대보다 뒤로 보내면 받침대 밑에 들어가요.",
    ],
  },
  {
    icon: "link-outline",
    title: "제품 추가",
    lines: [
      "링크로 추가: 제조사 제품 페이지 링크를 넣으면 이름·사진·크기를 가져와요. (쿠팡·네이버 스마트스토어는 지원하지 않아요)",
      "3D 모델로 추가: .glb 파일을 올리면 그 모양 그대로 3D에 보여요. Sketchfab, Meshy 등에서 받을 수 있어요.",
      "내 제품: 한 번 추가한 제품은 '내 제품'에 남아 다시 쓸 수 있어요.",
    ],
  },
  {
    icon: "cube-outline",
    title: "3D 보기",
    lines: [
      "오른쪽 위 '3D' 버튼으로 전환해요.",
      "빈 곳을 끌면 시점이 돌아가고, 제품을 끌면 옮겨져요.",
      "Shift를 누른 채 제품을 끌면 위아래로 띄워요.",
      "스크롤이나 트랙패드 핀치로 확대 · 축소해요.",
      "해 · 노을 · 달 버튼으로 낮 · 저녁 · 밤 조명을 바꿔요.",
    ],
  },
  {
    icon: "desktop-outline",
    title: "모니터",
    lines: ["모니터를 선택하면 세로로 돌리기(피벗), 틸트, 스위블, 높이를 조절할 수 있어요. 숫자를 직접 입력해도 돼요.", "모니터 암을 모니터 위에 놓으면 결합돼요."],
  },
  {
    icon: "home-outline",
    title: "방 꾸미기",
    lines: ["제품을 선택하지 않은 상태에서 아래 '방 꾸미기'를 눌러 의자 · 벽 색 · 바닥 · 창문을 고르세요. (3D에 보여요)"],
  },
  {
    icon: "keypad-outline",
    title: "단축키",
    lines: ["⌘Z 실행 취소 · ⌘⇧Z 다시 실행", "⌘D 복제 · ⌫ 삭제 · esc 선택 해제", "방향키 1cm 이동 (⇧ 함께 5cm)", "⌘S 셋업 저장"],
  },
  {
    icon: "save-outline",
    title: "저장",
    lines: ["지금 배치는 기기에 자동으로 남아요.", "'저장'으로 이름을 붙여 보관하고, 로그인하면 다른 기기에서도 불러올 수 있어요.", "왼쪽 위 그림 버튼으로 화면을 이미지로 저장해요."],
  },
];

export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onClose} accessibilityLabel="닫기">
        <Pressable className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900" style={{ maxHeight: "85%" }} onPress={() => {}}>
          <View className="flex-row items-center border-b border-zinc-800 px-5 py-4">
            <Text className="flex-1 text-lg font-bold text-white">DeskBoard 사용법</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={20} color="#a1a1aa" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            {SECTIONS.map((s) => (
              <View key={s.title}>
                <View className="flex-row items-center">
                  <Ionicons name={s.icon} size={16} color="#a5b4fc" />
                  <Text className="ml-1.5 text-sm font-semibold text-zinc-100">{s.title}</Text>
                </View>
                {s.lines.map((l) => (
                  <Text key={l} className="mt-1.5 text-[13px] leading-5 text-zinc-400">
                    · {l}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
