import { Alert, Platform } from "react-native";

/** 확인 대화상자. 웹에서는 Alert.alert가 동작하지 않아 window.confirm 사용 */
export function confirm(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: "취소", style: "cancel" },
    { text: okLabel, style: destructive ? "destructive" : "default", onPress: onOk },
  ]);
}
