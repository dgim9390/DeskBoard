import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pickImageFile, rankImages, removeBackground } from "@/lib/cutout";
import { canReadBlockedSites, defaultSize, fetchProductPreview, guessProduct, normalizeUrl, SHAPE_CHOICES, type ProductPreview } from "@/lib/productLink";
import type { Category, CustomProduct, ItemColor, ProductKind } from "@/store/useDeskStore";
import { ProductImage } from "./ProductImage";

type NewProduct = Omit<CustomProduct, "id" | "createdAt">;

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (p: NewProduct) => void;
}

type Display = "photo" | "shape";

/** 배경 지우기 진행 상태 (src: 처리한 원본 사진) */
type Cutout = { src: string; status: "working" } | { src: string; status: "done"; dataUrl: string } | { src: string; status: "failed"; reason: string };

const fmt = (n: number) => String(Math.round(n * 10) / 10);
const toNum = (t: string) => {
  const n = parseFloat(t.replace(",", "."));
  return Number.isFinite(n) && n >= 1 && n <= 300 ? n : null;
};

/** 제품 링크(또는 직접 입력)로 나만의 제품을 만들어 책상에 놓는 창 */
export function AddProductModal({ visible, onClose, onAdd }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false); // 입력 폼 표시 여부
  const [preview, setPreview] = useState<ProductPreview | null>(null);

  const [name, setName] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [sizeNote, setSizeNote] = useState<{ found: boolean; text?: string } | null>(null);
  const [sizeTouched, setSizeTouched] = useState(false); // 사용자가 크기를 직접 고쳤으면 추정값으로 덮지 않음
  const [imageUrl, setImageUrl] = useState("");
  const [display, setDisplay] = useState<Display>("shape");
  const [shape, setShape] = useState<ProductKind>("generic");
  const [category, setCategory] = useState<Category>("accessory");
  const [color, setColor] = useState<ItemColor>("black");
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  /** 페이지의 사진 후보와, 그중 깔끔한 사진을 찾는 중인지 */
  const [candidates, setCandidates] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const loadToken = useRef(0);
  const userPicked = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setUrl("");
    setLoading(false);
    setError(null);
    setEditing(false);
    setPreview(null);
    setName("");
    setW("");
    setH("");
    setSizeNote(null);
    setSizeTouched(false);
    setImageUrl("");
    setDisplay("shape");
    setShape("generic");
    setCategory("accessory");
    setColor("black");
    setCutout(null);
    setUseCutout(true);
    setCandidates([]);
    setPicking(false);
    loadToken.current++;
    userPicked.current = false;
  }, [visible]);

  /** 사용자가 직접 사진을 고르면 자동 선택이 덮어쓰지 않게 */
  const chooseImage = (url: string) => {
    userPicked.current = true;
    setImageUrl(url);
    setDisplay("photo");
  };

  /** 이름을 바탕으로 모양·분류·기본 크기를 채움 (크기는 비어 있을 때만) */
  const applyGuess = (title: string, found?: ProductPreview["dimensions"], keepSize = false) => {
    const g = guessProduct(title);
    setShape(g && SHAPE_CHOICES.some((s) => s.kind === g.kind) ? g.kind : "generic");
    setCategory(g?.category ?? "accessory");
    if (keepSize) return;
    if (found) {
      setW(fmt(found.width));
      setH(fmt(found.depth));
      setSizeNote({ found: true, text: found.text });
    } else {
      const d = defaultSize(g?.kind ?? null);
      setW(fmt(d.width));
      setH(fmt(d.height));
      setSizeNote({ found: false });
    }
  };

  const load = async () => {
    const normalized = normalizeUrl(url);
    if (!normalized) return setError("링크를 확인해 주세요. 예: https://www.logitech.com/…");
    setError(null);
    setLoading(true);
    try {
      const p = await fetchProductPreview(normalized);
      setPreview(p);
      const title = p.title ?? "";
      setName(title);
      setImageUrl(p.image ?? "");
      setDisplay(p.image ? "photo" : "shape");
      // 대표 사진은 홍보용 합성 이미지인 경우가 많아, 흰 배경 제품 사진을 찾아 바꿔 줌
      const list = p.images?.length ? p.images : p.image ? [p.image] : [];
      setCandidates(list);
      userPicked.current = false;
      const token = ++loadToken.current;
      if (list.length > 1) {
        setPicking(true);
        void rankImages(list)
          .then(({ ranked, best }) => {
            if (token !== loadToken.current) return;
            setCandidates(ranked); // 깔끔한 사진 먼저, 로고·아이콘은 뺌
            if (best && !userPicked.current) {
              setImageUrl(best);
              setDisplay("photo");
            }
          })
          .finally(() => token === loadToken.current && setPicking(false));
      }
      applyGuess(title, p.dimensions);
      setEditing(true);
    } catch (e) {
      // 읽기 실패해도 링크는 살려 두고 직접 입력으로 이어감
      const msg = e instanceof Error ? e.message : String(e);
      setError(/직접 입력/.test(msg) ? msg : `${msg} 아래에서 직접 입력할 수 있어요.`);
      setPreview(null);
      setDisplay(/사진 올리기/.test(msg) ? "photo" : "shape");
      applyGuess("");
      setEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const startManual = () => {
    setError(null);
    setPreview(null);
    setDisplay("shape");
    applyGuess("");
    setEditing(true);
  };

  const wn = toNum(w);
  const hn = toNum(h);
  const canAdd = editing && name.trim().length > 0 && wn !== null && hn !== null && !loading;
  const appReads = canReadBlockedSites();
  const photoUri = imageUrl.trim() && /^(https?:\/\/|data:image\/)/i.test(imageUrl.trim()) ? imageUrl.trim() : undefined;

  // 사진이 정해지면 자동으로 배경 지우기 (주소를 고치는 중에는 잠깐 기다림)
  useEffect(() => {
    if (!visible || display !== "photo" || !photoUri) return;
    if (cutout?.src === photoUri) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setCutout({ src: photoUri, status: "working" });
      const r = await removeBackground(photoUri);
      if (cancelled) return;
      setCutout(r.ok && r.dataUrl ? { src: photoUri, status: "done", dataUrl: r.dataUrl } : { src: photoUri, status: "failed", reason: r.reason ?? "배경을 지우지 못했어요." });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, display, photoUri]);

  const cut = cutout?.src === photoUri ? cutout : null;
  /** 책상에 올릴 사진: 배경을 지웠고 사용자가 끄지 않았으면 지운 사진 */
  const finalPhoto = cut?.status === "done" && useCutout ? cut.dataUrl : photoUri;

  const uploadPhoto = async () => {
    const data = await pickImageFile();
    if (!data) return;
    userPicked.current = true;
    setImageUrl(data);
    setDisplay("photo");
  };

  const submit = () => {
    if (!canAdd) return;
    const link = normalizeUrl(url) ?? undefined;
    const usePhoto = display === "photo" && !!finalPhoto;
    const shapeCat = SHAPE_CHOICES.find((s) => s.kind === shape)?.category;
    onAdd({
      name: name.trim().slice(0, 60),
      // 사진으로 표시해도 추천·결합에 쓰이도록 분류는 유지
      category: usePhoto ? category : shapeCat ?? category,
      kind: usePhoto ? "photo" : shape,
      width: wn!,
      height: hn!,
      color,
      imageUrl: usePhoto ? finalPhoto : undefined,
      link,
      site: preview?.siteName ?? (link ? new URL(link).hostname.replace(/^www\./, "") : undefined),
      price: preview?.price ?? undefined,
    });
  };

  const input = "h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white";
  const label = "mb-1 mt-4 text-xs font-semibold text-zinc-400";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1 items-center justify-center bg-black/60 px-4 py-10" onPress={onClose} accessibilityLabel="닫기">
          <Pressable className="max-h-full w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900" onPress={() => {}}>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text className="text-lg font-bold text-white">링크로 제품 추가</Text>
              <Text className="mt-1 text-sm leading-5 text-zinc-400">
                <Text className="font-semibold text-zinc-200">제조사 공식 홈페이지</Text>의 제품 페이지 링크를 붙여 넣으세요.
              </Text>
              <View className="mt-2 flex-row rounded-lg bg-zinc-950 px-3 py-2">
                <Ionicons name="information-circle-outline" size={14} color="#a1a1aa" style={{ marginTop: 1 }} />
                <Text className="ml-1.5 flex-1 text-xs leading-4 text-zinc-500">
                  예) 로지텍·애플·키크론·BenQ 공식몰 ✅{"\n"}
                  {appReads
                    ? "쿠팡 링크도 바로 불러와요 ✅ 네이버 스마트스토어 등 일부 쇼핑몰은 막혀 있을 수 있어요."
                    : "쿠팡 링크는 맥 앱에서 불러올 수 있어요. 웹에서는 이름·크기를 직접 넣고 사진을 올려 주세요."}
                </Text>
              </View>

              {/* 링크 입력 */}
              <View className="mt-4 flex-row items-center" style={{ gap: 8 }}>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://www.logitech.com/…"
                  placeholderTextColor="#52525b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={load}
                  accessibilityLabel="제품 링크"
                  className={`${input} flex-1`}
                />
                <Pressable
                  onPress={load}
                  disabled={loading || !url.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="불러오기"
                  className={`h-10 min-w-[76px] items-center justify-center rounded-lg px-3 ${loading || !url.trim() ? "bg-zinc-800" : "bg-indigo-500 active:bg-indigo-600"}`}
                >
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-sm font-semibold text-white">불러오기</Text>}
                </Pressable>
              </View>
              {!editing && (
                <Pressable onPress={startManual} className="mt-2 self-start" accessibilityRole="button" accessibilityLabel="링크 없이 직접 입력">
                  <Text className="text-xs text-zinc-400 underline">링크 없이 직접 입력</Text>
                </Pressable>
              )}
              {error && <Text className="mt-3 text-sm leading-5 text-amber-400">{error}</Text>}

              {editing && (
                <View>
                  {/* 미리보기 */}
                  <View className="mt-4 flex-row items-center rounded-xl bg-zinc-950 p-3">
                    <View className="mr-3 h-16 w-20 items-center justify-center rounded-lg bg-[#b98e63]">
                      <ProductImage
                        kind={display === "photo" && finalPhoto ? "photo" : shape}
                        imageUrl={finalPhoto}
                        label={name || "제품"}
                        color={color}
                        width={68}
                        height={52}
                        dims={wn && hn ? { w: wn, h: hn } : undefined}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-zinc-100" numberOfLines={2}>
                        {name || "이름을 입력해 주세요"}
                      </Text>
                      <Text className="mt-0.5 text-xs text-zinc-500" numberOfLines={1}>
                        {preview?.siteName ?? (normalizeUrl(url) ? "링크 저장됨" : "직접 입력")}
                      </Text>
                    </View>
                  </View>

                  <Text className={label}>이름</Text>
                  <TextInput value={name} onChangeText={setName} placeholder="예: 로지텍 MX Keys S" placeholderTextColor="#52525b" accessibilityLabel="제품 이름" className={input} onBlur={() => !preview && name && applyGuess(name, undefined, sizeTouched)} />

                  <Text className={label}>위에서 본 크기 (가로 × 깊이, cm)</Text>
                  <View className="flex-row items-center">
                    <TextInput value={w} onChangeText={(t) => { setW(t); setSizeTouched(true); }} keyboardType="decimal-pad" accessibilityLabel="가로 cm" className={`${input} text-center`} style={{ width: 72 }} />
                    <Text className="mx-2 text-zinc-500">×</Text>
                    <TextInput value={h} onChangeText={(t) => { setH(t); setSizeTouched(true); }} keyboardType="decimal-pad" accessibilityLabel="깊이 cm" className={`${input} text-center`} style={{ width: 72 }} />
                    <Text className="ml-2 text-xs text-zinc-500">cm</Text>
                    <Pressable
                      onPress={() => {
                        setW(h);
                        setH(w);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="가로 세로 바꾸기"
                      className="ml-auto flex-row items-center rounded-lg border border-zinc-700 px-2.5 py-2 active:bg-zinc-800"
                    >
                      <Ionicons name="swap-horizontal" size={14} color="#d4d4d8" />
                      <Text className="ml-1 text-xs text-zinc-300">바꾸기</Text>
                    </Pressable>
                  </View>
                  {sizeNote && (
                    <Text className={`mt-1.5 text-xs leading-4 ${sizeNote.found ? "text-emerald-400" : "text-amber-400"}`}>
                      {sizeNote.found
                        ? `페이지에서 찾은 크기예요 ("${sizeNote.text}"). 높이가 섞였을 수 있으니 확인해 주세요.`
                        : "크기를 찾지 못해 비슷한 제품의 크기를 넣었어요. 실제 크기로 고쳐 주세요."}
                    </Text>
                  )}
                  {(wn === null || hn === null) && <Text className="mt-1 text-xs text-red-400">1~300cm 사이 숫자를 넣어 주세요.</Text>}

                  <Text className={label}>책상에 표시할 모습</Text>
                  <View className="flex-row rounded-lg bg-zinc-950 p-1">
                    {(["photo", "shape"] as const).map((d) => (
                      <Pressable
                        key={d}
                        onPress={() => setDisplay(d)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: display === d }}
                        className={`flex-1 items-center rounded-md py-2 ${display === d ? "bg-zinc-800" : ""}`}
                      >
                        <Text className={`text-xs font-semibold ${display === d ? "text-white" : "text-zinc-500"}`}>{d === "photo" ? "제품 사진" : "위에서 본 그림"}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {display === "photo" ? (
                    <View>
                      <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
                        <TextInput
                          value={imageUrl.startsWith("data:") ? "내 컴퓨터에서 올린 사진" : imageUrl}
                          onChangeText={(t) => {
                            userPicked.current = true;
                            setImageUrl(t);
                          }}
                          editable={!imageUrl.startsWith("data:")}
                          placeholder="사진 주소 (https://…jpg)"
                          placeholderTextColor="#52525b"
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel="사진 주소"
                          className={`${input} flex-1`}
                        />
                        {Platform.OS === "web" && (
                          <Pressable
                            onPress={imageUrl.startsWith("data:") ? () => setImageUrl("") : uploadPhoto}
                            accessibilityRole="button"
                            accessibilityLabel={imageUrl.startsWith("data:") ? "올린 사진 지우기" : "사진 올리기"}
                            className="h-10 flex-row items-center rounded-lg border border-zinc-700 px-2.5 active:bg-zinc-800"
                          >
                            <Ionicons name={imageUrl.startsWith("data:") ? "close" : "cloud-upload-outline"} size={15} color="#d4d4d8" />
                            <Text className="ml-1 text-xs text-zinc-300">{imageUrl.startsWith("data:") ? "지우기" : "사진 올리기"}</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* 페이지의 다른 사진 고르기 */}
                      {candidates.length > 1 && (
                        <View className="mt-2">
                          <Text className="mb-1.5 text-xs text-zinc-500">
                            {picking ? "배경이 깔끔한 사진을 찾는 중…" : `다른 사진 고르기 · ${candidates.length}장`}
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {candidates.slice(0, 24).map((u) => {
                              const on = u === imageUrl;
                              return (
                                <Pressable
                                  key={u}
                                  onPress={() => chooseImage(u)}
                                  accessibilityRole="button"
                                  accessibilityLabel="이 사진 쓰기"
                                  accessibilityState={{ selected: on }}
                                  className="h-14 w-14 overflow-hidden rounded-lg bg-white"
                                  style={{ borderWidth: 2, borderColor: on ? "#818cf8" : "transparent" }}
                                >
                                  <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}

                      {/* 배경 지우기 (누끼) */}
                      {photoUri && (
                        <View className="mt-2 flex-row items-center rounded-lg bg-zinc-950 px-3 py-2">
                          {cut?.status === "working" || !cut ? (
                            <>
                              <ActivityIndicator size="small" color="#a5b4fc" />
                              <Text className="ml-2 flex-1 text-xs text-zinc-400">배경 지우는 중…</Text>
                            </>
                          ) : cut.status === "done" ? (
                            <>
                              <Ionicons name="cut-outline" size={15} color={useCutout ? "#6ee7b7" : "#71717a"} />
                              <Text className={`ml-2 flex-1 text-xs ${useCutout ? "text-emerald-300" : "text-zinc-500"}`}>{useCutout ? "배경을 지웠어요" : "원래 사진 그대로 쓰기"}</Text>
                              <Pressable
                                onPress={() => setUseCutout((v) => !v)}
                                accessibilityRole="switch"
                                accessibilityLabel="배경 지우기"
                                accessibilityState={{ checked: useCutout }}
                                className={`h-6 w-11 justify-center rounded-full px-0.5 ${useCutout ? "bg-emerald-500" : "bg-zinc-700"}`}
                              >
                                <View className="h-5 w-5 rounded-full bg-white" style={{ alignSelf: useCutout ? "flex-end" : "flex-start" }} />
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Ionicons name="alert-circle-outline" size={15} color="#fbbf24" />
                              <Text className="ml-2 flex-1 text-xs leading-4 text-amber-300">{cut.reason} 원래 사진으로 표시돼요.</Text>
                            </>
                          )}
                        </View>
                      )}
                      <Text className="mt-1.5 text-xs leading-4 text-zinc-500">
                        {photoUri
                          ? "상품 페이지의 대표 사진이에요. 흰 배경 사진이면 배경을 자동으로 지워요."
                          : "사진이 없으면 이름이 적힌 상자로 표시돼요. 상품 사진을 우클릭해 '이미지 주소 복사'로 넣거나, 저장한 사진을 올릴 수 있어요."}
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-2 flex-row" style={{ flexWrap: "wrap", gap: 6 }}>
                      {SHAPE_CHOICES.map((s) => (
                        <Pressable
                          key={s.kind}
                          onPress={() => {
                            setShape(s.kind);
                            setCategory(s.category);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: shape === s.kind }}
                          className={`rounded-lg border px-2.5 py-1.5 ${shape === s.kind ? "border-indigo-400 bg-indigo-500/20" : "border-zinc-700 active:bg-zinc-800"}`}
                        >
                          <Text className={`text-xs ${shape === s.kind ? "font-semibold text-indigo-200" : "text-zinc-300"}`}>{s.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {!(display === "photo" && finalPhoto) && (
                    <View className="mt-3 flex-row items-center">
                      <Text className="mr-2 text-xs text-zinc-400">색상</Text>
                      {(["black", "white"] as const).map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setColor(c)}
                          accessibilityRole="button"
                          accessibilityLabel={c === "black" ? "블랙" : "화이트"}
                          accessibilityState={{ selected: color === c }}
                          className="mr-1.5 h-7 w-7 items-center justify-center rounded-full"
                          style={{ borderWidth: 2, borderColor: color === c ? "#818cf8" : "transparent" }}
                        >
                          <View className="h-5 w-5 rounded-full" style={{ backgroundColor: c === "black" ? "#18181b" : "#f4f4f5", borderWidth: 1, borderColor: "#52525b" }} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View className="mt-6 flex-row justify-end" style={{ gap: 8 }}>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="취소" className="rounded-lg border border-zinc-700 px-4 py-2.5 active:bg-zinc-800">
                  <Text className="text-sm font-semibold text-zinc-300">취소</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={!canAdd}
                  accessibilityRole="button"
                  accessibilityLabel="책상에 놓기"
                  className={`rounded-lg px-4 py-2.5 ${canAdd ? "bg-indigo-500 active:bg-indigo-600" : "bg-zinc-800"}`}
                >
                  <Text className={`text-sm font-semibold ${canAdd ? "text-white" : "text-zinc-500"}`}>책상에 놓기</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
