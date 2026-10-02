/** 단어 끝 받침에 맞춰 '을/를' 붙이기 (한글이 아니면 숫자·영문 발음으로 추정) */
export function eulReul(word: string): string {
  const last = word.trim().replace(/['")\]]+$/, "").slice(-1);
  const code = last.charCodeAt(0);
  let batchim: boolean | null = null;
  if (code >= 0xac00 && code <= 0xd7a3) batchim = (code - 0xac00) % 28 !== 0;
  else if (/[0-9]/.test(last)) batchim = "013678".includes(last); // 영·일·삼·육·칠·팔
  else if (/[a-z]/i.test(last)) batchim = "lmnr".includes(last.toLowerCase());
  return `${word}${batchim === null ? "을(를)" : batchim ? "을" : "를"}`;
}
