import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SECTION_LABEL, type Product } from "@/lib/recommend";
import { ProductImage } from "./ProductImage";

interface Props {
  product: Product;
  /** 이미 책상에 놓인 제품인지 */
  placed: boolean;
  onPlace: (product: Product) => void;
}

export function ProductCard({ product, placed, onPlace }: Props) {
  return (
    <View className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
      <View className="flex-row">
        <View className="mr-3 h-24 w-28 items-center justify-center rounded-xl bg-[#b98e63]">
          <ProductImage kind={product.kind} width={96} height={72} />
        </View>
        <View className="flex-1">
          <View className="mb-1 flex-row items-center justify-between">
            <View className="flex-row">
              {product.matched && (
                <View className="mr-1 rounded-full bg-emerald-500/20 px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-emerald-300">내 책상 맞춤</Text>
                </View>
              )}
              <View className="rounded-full bg-indigo-500/20 px-2 py-0.5">
                <Text className="text-[11px] font-bold text-indigo-300">{SECTION_LABEL[product.section]}</Text>
              </View>
            </View>
          </View>
          <Text className="text-base font-semibold text-zinc-100">{product.name}</Text>
          <Text className="mt-0.5 text-xs leading-4 text-zinc-400">{product.reason}</Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center">
        <Text className="flex-1 text-xs text-zinc-500">
          크기 {product.width}×{product.height}cm
        </Text>
        <Pressable
          onPress={() => onPlace(product)}
          accessibilityRole="button"
          accessibilityLabel={`${product.name} 책상에 놓기`}
          className={`flex-row items-center rounded-lg px-3 py-2 ${placed ? "bg-zinc-800 active:bg-zinc-700" : "bg-indigo-500 active:bg-indigo-600"}`}
        >
          <Ionicons name={placed ? "checkmark" : "add"} size={16} color="white" />
          <Text className="ml-1 text-sm font-semibold text-white">{placed ? "배치됨 · 하나 더" : "책상에 놓기"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
