package com.iohao.mmo.map.zone;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.map.proto.*;
import com.iohao.mmo.map.room.MapPlayer;
import com.iohao.mmo.map.room.MapRoomService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ZoneService {

    @Resource
    MapRoomService roomService;

    private final Map<String, JSONObject> zoneMap = new LinkedHashMap<>();
    /** playerId → zoneId */
    private final ConcurrentHashMap<Long, String> playerZone = new ConcurrentHashMap<>();

    static final String DEFAULT_ZONE = "main_city";

    @PostConstruct
    public void init() {
        try (InputStream is = new ClassPathResource("zones.json").getInputStream()) {
            JSONObject root = JSON.parseObject(is.readAllBytes());
            for (Object obj : root.getJSONArray("zones")) {
                JSONObject zone = (JSONObject) obj;
                zoneMap.put(zone.getString("zoneId"), zone);
            }
            log.info("Loaded {} zones from zones.json", zoneMap.size());
        } catch (Exception e) {
            log.error("Failed to load zones.json", e);
        }
    }

    public String getPlayerZone(long playerId) {
        return playerZone.getOrDefault(playerId, DEFAULT_ZONE);
    }

    public void setPlayerZone(long playerId, String zoneId) {
        playerZone.put(playerId, zoneId);
    }

    public ZoneInfoProto getZoneInfo(long playerId) {
        String zoneId = getPlayerZone(playerId);
        return buildProto(zoneId, playerId);
    }

    /** Returns updated zone info if move is legal, null otherwise */
    public ZoneInfoProto moveToZone(long playerId, String targetZoneId) {
        String currentZoneId = getPlayerZone(playerId);
        JSONObject current = zoneMap.get(currentZoneId);
        if (current == null) return null;

        boolean validExit = current.getJSONArray("exits").stream()
                .anyMatch(e -> targetZoneId.equals(((JSONObject) e).getString("target")));
        if (!validExit || !zoneMap.containsKey(targetZoneId)) return null;

        setPlayerZone(playerId, targetZoneId);
        return buildProto(targetZoneId, playerId);
    }

    public List<NearbyPlayerProto> getNearbyPlayers(long playerId) {
        String zoneId = getPlayerZone(playerId);
        List<NearbyPlayerProto> result = new ArrayList<>();
        playerZone.forEach((pid, zid) -> {
            if (zid.equals(zoneId) && pid != playerId) {
                MapPlayer mp = findPlayer(pid);
                NearbyPlayerProto p = new NearbyPlayerProto();
                p.playerId = pid;
                p.name = mp != null ? mp.getNickname() : "玩家" + pid;
                p.level = 1;
                p.zoneId = zoneId;
                p.portraitUrl = "";
                result.add(p);
            }
        });
        return result;
    }

    private MapPlayer findPlayer(long playerId) {
        var room = roomService.getRoom(1L);
        if (room == null) return null;
        return room.getPlayerById(playerId);
    }

    private ZoneInfoProto buildProto(String zoneId, long playerId) {
        JSONObject zone = zoneMap.getOrDefault(zoneId, zoneMap.get(DEFAULT_ZONE));
        ZoneInfoProto proto = new ZoneInfoProto();
        proto.zoneId = zone.getString("zoneId");
        proto.name = zone.getString("nameTemplate");
        proto.coordX = zone.getIntValue("coordX");
        proto.coordY = zone.getIntValue("coordY");
        proto.description = zone.getString("description");
        proto.sceneHint = zone.getString("sceneHint");

        proto.exits = zone.getJSONArray("exits").stream().map(e -> {
            JSONObject ex = (JSONObject) e;
            ZoneExitProto ep = new ZoneExitProto();
            ep.direction = ex.getString("direction");
            ep.targetZoneId = ex.getString("target");
            ep.label = ex.getString("labelTemplate");
            return ep;
        }).collect(Collectors.toList());

        proto.hotEvents = zone.getJSONArray("hotEvents").stream().map(e -> {
            JSONObject he = (JSONObject) e;
            ZoneHotEventProto hp = new ZoneHotEventProto();
            hp.id = he.getString("id");
            hp.label = he.getString("label");
            hp.pageId = he.getString("pageId");
            return hp;
        }).collect(Collectors.toList());

        proto.nearbyPlayers = new ArrayList<>();
        return proto;
    }
}
