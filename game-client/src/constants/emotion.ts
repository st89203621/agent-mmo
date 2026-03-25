/** 情绪中文标签（含AI可能返回的近义词兜底） */
export const EMOTION_LABELS: Record<string, string> = {
  calm: '平静', happy: '欢喜', sad: '悲伤', angry: '愤怒',
  shy: '娇羞', surprised: '惊讶', tender: '温柔', cold: '冷漠',
  fearful: '恐惧', determined: '坚定', melancholy: '忧郁', playful: '俏皮',
  gentle: '温柔', worried: '忧虑', serious: '肃穆', nervous: '紧张',
  excited: '兴奋', confused: '困惑', proud: '骄傲', lonely: '孤寂',
};

/** 情绪对应色值（用于记忆碎片等场景） */
export const EMOTION_COLORS: Record<string, string> = {
  calm: '#8b9dc3', happy: '#f0c040', sad: '#7a8fb5', angry: '#c44e52',
  shy: '#e8b4c8', surprised: '#e8a040', tender: '#c8a0d0', cold: '#88a8c8',
  fearful: '#8888a8', determined: '#d48040', melancholy: '#9090b0', playful: '#e8c070',
};
