import { useState, useEffect, useMemo, useRef } from 'react';
import { generateSceneImage } from '../services/api';
import type { NpcInfo } from '../types';

/** 模块级缓存：npcId → imageUrl，跨组件/跨渲染共享 */
const portraitCache = new Map<string, string>();

/** 正在请求中的 npcId，防止重复触发 */
const pendingIds = new Set<string>();

export function useNpcPortraits(npcs: NpcInfo[], worldIndex: number, artStyle: string) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const artStyleRef = useRef(artStyle);
  artStyleRef.current = artStyle;

  // 稳定的 ID 列表，避免数组引用变化导致 effect 反复触发
  const npcIds = useMemo(() => npcs.map(n => n.npcId).join(','), [npcs]);

  useEffect(() => {
    if (!npcIds) return;

    // 先填充已缓存的
    const cached: Record<string, string> = {};
    for (const npc of npcs) {
      const url = portraitCache.get(npc.npcId);
      if (url) cached[npc.npcId] = url;
    }
    if (Object.keys(cached).length > 0) {
      setUrls(prev => ({ ...prev, ...cached }));
    }

    // 请求未缓存的
    for (const npc of npcs) {
      if (portraitCache.has(npc.npcId) || pendingIds.has(npc.npcId)) continue;

      pendingIds.add(npc.npcId);
      generateSceneImage(npc.npcId, worldIndex, artStyleRef.current || undefined)
        .then((res) => {
          portraitCache.set(npc.npcId, res.imageUrl);
          pendingIds.delete(npc.npcId);
          setUrls(prev => ({ ...prev, [npc.npcId]: res.imageUrl }));
        })
        .catch(() => {
          pendingIds.delete(npc.npcId);
        });
    }
  }, [npcIds, worldIndex]);

  return urls;
}
