import { View } from "react-native";
import type { DeskItem, DeskSize } from "@/store/useDeskStore";
import { DeskSurface } from "./DeskSurface";
import { DEFAULT_KIND, ProductImage } from "./ProductImage";

/** 저장된 배치의 축소 미리보기 (터치 없음) */
export function SetupPreview({ desk, items, width }: { desk: DeskSize; items: DeskItem[]; width: number }) {
  const scale = width / desk.width;
  const height = desk.depth * scale;
  return (
    <View pointerEvents="none" style={{ width, height, borderRadius: 4, overflow: "hidden" }}>
      <DeskSurface width={width} height={height} />
      {items.map((i) => (
        <View
          key={i.id}
          style={{
            position: "absolute",
            left: i.x * scale,
            top: i.y * scale,
            width: i.width * scale,
            height: i.height * scale,
            transform: [{ rotate: `${i.rotation}deg` }],
          }}
        >
          <ProductImage
            kind={i.kind ?? DEFAULT_KIND[i.category]}
            width="100%"
            height="100%"
            fit="none"
            color={i.color}
            mount={i.mount}
            dims={{ w: i.width, h: i.height }}
          />
        </View>
      ))}
    </View>
  );
}
