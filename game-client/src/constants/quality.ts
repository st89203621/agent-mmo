/** 装备品质名称（按索引） */
export const QUALITY_NAMES = ['普通', '精良', '稀有', '史诗', '传说', '神话'];

/** 装备品质颜色（CSS变量，按索引） */
export const QUALITY_COLORS = [
  'var(--quality-common)', 'var(--quality-uncommon)', 'var(--quality-rare)',
  'var(--quality-epic)', 'var(--quality-legendary)', 'var(--quality-mythic)',
];

/** 品质颜色（按英文 key，用于灵侣/背包等系统） */
export const QUALITY_COLOR_MAP: Record<string, string> = {
  common: 'var(--quality-common)',
  uncommon: 'var(--quality-uncommon)',
  rare: 'var(--quality-rare)',
  epic: 'var(--quality-epic)',
  legendary: 'var(--quality-legendary)',
  mythic: 'var(--quality-mythic)',
};

/** 灵侣品质标签 */
export const QUALITY_LABELS: Record<string, string> = {
  common: '凡品', uncommon: '良品', rare: '珍品', epic: '极品', legendary: '仙品',
};
