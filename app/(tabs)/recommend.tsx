import { ScrollView, View } from "react-native";
import { ProductFinder } from "@/components/ProductFinder";

export default function RecommendScreen() {
  return (
    <View className="flex-1 bg-zinc-950">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <ProductFinder />
      </ScrollView>
    </View>
  );
}
