import { useState, useEffect, useRef } from 'react';
import { generateSceneImage } from '../services/api';
import type { NpcInfo } from '../types';

/** 模块级缓存：npcId → imageUrl，跨组件/跨渲染共享 */
const portraitCache = new Map<string, string>();

/** 正在请求中的 npcId，防止重复触发 */
const pendingIds = new Set<string>();

/**
 * 为 NPC 列表懒加载肖像图片。
 * - 后端按 npcId+worldIndex+artStyle 缓存，不同玩家共享同一张图
 * - 前端用模块级 Map 缓存 URL，切页后不重新请求
 */
export function useNpcPortraits(npcs: NpcInfo[], worldIndex: number, artStyle: string) {
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const npc of npcs) {
      const cached = portraitCache.get(npc.npcId);
      if (cached) init[npc.npcId] = cached;
    }
    return init;
  });

  const artStyleRef = useRef(artStyle);
  artStyleRef.current = artStyle;

  useEffect(() => {
    let cancelled = false;

    for (const npc of npcs) {
      if (portraitCache.has(npc.npcId) || pendingIds.has(npc.npcId)) continue;

      pendingIds.add(npc.npcId);
      generateSceneImage(npc.npcId, worldIndex, artStyleRef.current || undefined)
        .then((res) => {
          portraitCache.set(npc.npcId, res.imageUrl);
          pendingIds.delete(npc.npcId);
          if (!cancelled) {
            setUrls((prev) => ({ ...prev, [npc.npcId]: res.imageUrl }));
          }
        })
        .catch(() => {
          pendingIds.delete(npc.npcId);
        });
    }

    return () => { cancelled = true; };
  }, [npcs, worldIndex]);

  return urls;
}
