import { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";

interface Props {
  w: number;
  h: number;
  min: { w: number; h: number };
  onChange: (w: number, h: number) => void;
  /** 대상이 바뀔 때(다른 아이템 선택 등) 입력창을 다시 채우기 위한 키 */
  resetKey: string;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

const parse = (t: string, min: number) => {
  const n = parseFloat(t.replace(",", "."));
  return Number.isFinite(n) && n >= min ? n : null;
};

/** 가로 × 세로(cm) 입력. 유효한 값이면 타이핑하는 즉시 반영, 범위 보정은 스토어가 처리 */
export function SizeFields({ w, h, min, onChange, resetKey }: Props) {
  const [wt, setWt] = useState(fmt(w));
  const [ht, setHt] = useState(fmt(h));

  // 외부 값(스토어 보정 등)이 입력 중인 값과 다르면 입력창을 맞춤
  useEffect(() => {
    const pw = parse(wt, min.w);
    const ph = parse(ht, min.h);
    if (pw === null || Math.abs(pw - w) > 0.05) setWt(fmt(w));
    if (ph === null || Math.abs(ph - h) > 0.05) setHt(fmt(h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, resetKey]);

  const input = "h-9 w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-sm text-white";

  return (
    <>
      <TextInput
        className={input}
        value={wt}
        onChangeText={(t) => {
          setWt(t);
          const pw = parse(t, min.w);
          if (pw !== null) onChange(pw, parse(ht, min.h) ?? h);
        }}
        onBlur={() => setWt(fmt(w))}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel="가로 cm"
      />
      <Text className="mx-1.5 text-zinc-500">×</Text>
      <TextInput
        className={input}
        value={ht}
        onChangeText={(t) => {
          setHt(t);
          const ph = parse(t, min.h);
          if (ph !== null) onChange(parse(wt, min.w) ?? w, ph);
        }}
        onBlur={() => setHt(fmt(h))}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel="세로 cm"
      />
      <Text className="ml-1.5 text-xs text-zinc-500">cm</Text>
    </>
  );
}
