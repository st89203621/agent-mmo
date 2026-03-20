package com.iohao.mmo.adventure.service;

import com.iohao.mmo.adventure.entity.*;
import com.iohao.mmo.adventure.repository.*;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdventureService {
    
    @Resource
    DungeonRepository dungeonRepository;
    
    @Resource
    ExplorationRepository explorationRepository;
    
    @Resource
    TreasureHuntRepository treasureHuntRepository;
    
    @Resource
    TimeRiftRepository timeRiftRepository;
    
    @Resource
    EndlessTrialRepository endlessTrialRepository;
    
    @Resource
    SecretRealmRepository secretRealmRepository;
    
    // ========== 副本系统 ==========
    
    public List<Dungeon> listDungeons(long userId) {
        return dungeonRepository.findByUserId(userId);
    }
    
    public Dungeon enterDungeon(long userId, String dungeonId, int difficulty) {
        Dungeon dungeon = new Dungeon();
        dungeon.setUserId(userId);
        dungeon.setDungeonId(dungeonId);
        dungeon.setDungeonName(getDungeonName(dungeonId));
        dungeon.setType(getDungeonType(dungeonId));
        dungeon.setCurrentStage(1);
        dungeon.setMaxStage(getMaxStages(dungeonId));
        dungeon.setStatus(Dungeon.DungeonStatus.IN_PROGRESS);
        dungeon.setStartTime(System.currentTimeMillis());
        dungeon.setDifficulty(difficulty);
        dungeon.setFirstClear(true);
        dungeon.setClearCount(0);
        return dungeonRepository.save(dungeon);
    }
    
    public Dungeon exitDungeon(long userId, String dungeonId) {
        Dungeon dungeon = dungeonRepository.findByUserIdAndDungeonId(userId, dungeonId);
        if (dungeon != null) {
            dungeon.setStatus(Dungeon.DungeonStatus.FAILED);
            return dungeonRepository.save(dungeon);
        }
        return null;
    }
    
    public Dungeon completeStage(long userId, String dungeonId, int stageId, int stars) {
        Dungeon dungeon = dungeonRepository.findByUserIdAndDungeonId(userId, dungeonId);
        if (dungeon != null) {
            Dungeon.StageProgress progress = new Dungeon.StageProgress();
            progress.setStageId(stageId);
            progress.setStageName("关卡 " + stageId);
            progress.setCompleted(true);
            progress.setStars(stars);
            progress.setClearTime(System.currentTimeMillis() - dungeon.getStartTime());
            dungeon.getStageProgress().add(progress);
            
            if (stageId >= dungeon.getMaxStage()) {
                dungeon.setStatus(Dungeon.DungeonStatus.COMPLETED);
                dungeon.setCompleteTime(System.currentTimeMillis());
                dungeon.setClearCount(dungeon.getClearCount() + 1);
                generateDungeonReward(dungeon);
            } else {
                dungeon.setCurrentStage(stageId + 1);
            }
            return dungeonRepository.save(dungeon);
        }
        return null;
    }
    
    // ========== 探险系统 ==========
    
    public Exploration startExploration(long userId, String location) {
        Exploration exploration = new Exploration();
        exploration.setUserId(userId);
        exploration.setExplorationId(UUID.randomUUID().toString());
        exploration.setLocation(location);
        exploration.setStatus(Exploration.ExplorationStatus.EXPLORING);
        exploration.setStartTime(System.currentTimeMillis());
        exploration.setCurrentStep(0);
        exploration.setTotalSteps(10);
        return explorationRepository.save(exploration);
    }
    
    public Exploration.ExplorationEvent triggerExplorationEvent(long userId, String explorationId) {
        Exploration exploration = explorationRepository.findByUserIdAndExplorationId(userId, explorationId);
        if (exploration != null) {
            Exploration.ExplorationEvent event = generateRandomEvent();
            exploration.getEvents().add(event);
            exploration.setCurrentStep(exploration.getCurrentStep() + 1);

            if (exploration.getCurrentStep() >= exploration.getTotalSteps()) {
                exploration.setStatus(Exploration.ExplorationStatus.COMPLETED);
                exploration.setEndTime(System.currentTimeMillis());
                generateExplorationReward(exploration);
            }
            explorationRepository.save(exploration);
            return event;
        }
        return null;
    }

    public List<Exploration> getExplorationHistory(long userId) {
        return explorationRepository.findByUserId(userId);
    }

    // ========== 宝藏猎人 ==========
    
    public List<TreasureHunt> getTreasureMaps(long userId) {
        return treasureHuntRepository.findByUserId(userId);
    }
    
    public TreasureHunt startTreasureHunt(long userId, String mapId) {
        TreasureHunt hunt = new TreasureHunt();
        hunt.setUserId(userId);
        hunt.setMapId(mapId);
        hunt.setMapName("宝藏地图 #" + mapId);
        hunt.setRarity(randomRarity());
        hunt.setX((int)(Math.random() * 1000));
        hunt.setY((int)(Math.random() * 1000));
        hunt.setStatus(TreasureHunt.TreasureStatus.SEARCHING);
        hunt.setStartTime(System.currentTimeMillis());
        hunt.setDigProgress(0);
        hunt.setDigRequired(10);
        return treasureHuntRepository.save(hunt);
    }
    
    public TreasureHunt digTreasure(long userId, String huntId) {
        TreasureHunt hunt = treasureHuntRepository.findById(huntId).orElse(null);
        if (hunt != null && hunt.getUserId() == userId) {
            hunt.setDigProgress(hunt.getDigProgress() + 1);
            if (hunt.getDigProgress() >= hunt.getDigRequired()) {
                hunt.setStatus(TreasureHunt.TreasureStatus.FOUND);
                hunt.setFoundTime(System.currentTimeMillis());
                generateTreasureChest(hunt);
            }
            return treasureHuntRepository.save(hunt);
        }
        return null;
    }
    
    public TreasureHunt.TreasureChest openTreasureChest(long userId, String huntId) {
        TreasureHunt hunt = treasureHuntRepository.findById(huntId).orElse(null);
        if (hunt != null && hunt.getUserId() == userId && hunt.getStatus() == TreasureHunt.TreasureStatus.FOUND) {
            hunt.setStatus(TreasureHunt.TreasureStatus.OPENED);
            treasureHuntRepository.save(hunt);
            return hunt.getChest();
        }
        return null;
    }
    
    // ========== 时空裂缝 ==========
    
    public List<TimeRift> listTimeRifts() {
        return timeRiftRepository.findByStatus(TimeRift.RiftStatus.ACTIVE);
    }
    
    public TimeRift enterTimeRift(long userId, String riftId) {
        TimeRift rift = new TimeRift();
        rift.setUserId(userId);
        rift.setRiftId(riftId);
        rift.setRiftName("时空裂缝 #" + riftId);
        rift.setType(randomRiftType());
        rift.setLevel((int)(Math.random() * 50) + 1);
        rift.setStatus(TimeRift.RiftStatus.ACTIVE);
        rift.setStartTime(System.currentTimeMillis());
        rift.setCurrentWave(1);
        rift.setMaxWave(10);
        return timeRiftRepository.save(rift);
    }
    
    public TimeRift timeRiftChallenge(long userId, String riftId, int wave) {
        TimeRift rift = timeRiftRepository.findById(riftId).orElse(null);
        if (rift != null && rift.getUserId() == userId) {
            TimeRift.RiftChallenge challenge = new TimeRift.RiftChallenge();
            challenge.setWave(wave);
            challenge.setChallengeType("战斗");
            challenge.setCompleted(true);
            challenge.setClearTime(System.currentTimeMillis() - rift.getStartTime());
            challenge.setScore((int)(Math.random() * 1000));
            rift.getChallenges().add(challenge);
            rift.setCurrentWave(wave + 1);
            
            if (wave >= rift.getMaxWave()) {
                rift.setStatus(TimeRift.RiftStatus.CLOSED);
                rift.setEndTime(System.currentTimeMillis());
                generateRiftReward(rift);
            }
            return timeRiftRepository.save(rift);
        }
        return null;
    }
    
    // ========== 无尽试炼 ==========
    
    public EndlessTrial startEndlessTrial(long userId, String playerName) {
        EndlessTrial trial = new EndlessTrial();
        trial.setUserId(userId);
        trial.setPlayerName(playerName);
        trial.setStatus(EndlessTrial.TrialStatus.FIGHTING);
        trial.setStartTime(System.currentTimeMillis());
        trial.setCurrentWave(1);
        trial.setMaxWaveReached(0);
        trial.setTotalKills(0);
        trial.setTotalDamage(0);
        trial.setScore(0);
        return endlessTrialRepository.save(trial);
    }
    
    public EndlessTrial nextWave(long userId, String trialId, int kills, int damage) {
        EndlessTrial trial = endlessTrialRepository.findById(trialId).orElse(null);
        if (trial != null && trial.getUserId() == userId) {
            EndlessTrial.WaveRecord record = new EndlessTrial.WaveRecord();
            record.setWave(trial.getCurrentWave());
            record.setEnemyCount((int)(Math.random() * 20) + 5);
            record.setKills(kills);
            record.setClearTime(System.currentTimeMillis() - trial.getStartTime());
            record.setBossWave(trial.getCurrentWave() % 5 == 0);
            if (record.isBossWave()) {
                record.setBossName("BOSS-" + trial.getCurrentWave());
            }
            trial.getWaveRecords().add(record);
            
            trial.setCurrentWave(trial.getCurrentWave() + 1);
            trial.setMaxWaveReached(Math.max(trial.getMaxWaveReached(), trial.getCurrentWave()));
            trial.setTotalKills(trial.getTotalKills() + kills);
            trial.setTotalDamage(trial.getTotalDamage() + damage);
            trial.setScore(trial.getScore() + kills * 10 + damage / 100);
            trial.setSurvivalTime(System.currentTimeMillis() - trial.getStartTime());
            
            return endlessTrialRepository.save(trial);
        }
        return null;
    }
    
    public List<EndlessTrial> getTrialRanking() {
        return endlessTrialRepository.findTop100ByOrderByMaxWaveReachedDescScoreDesc();
    }
    
    // ========== 秘境探索 ==========
    
    public List<SecretRealm> listSecretRealms(long userId) {
        return secretRealmRepository.findByUserId(userId);
    }
    
    public SecretRealm enterSecretRealm(long userId, String realmId) {
        SecretRealm realm = new SecretRealm();
        realm.setUserId(userId);
        realm.setRealmId(realmId);
        realm.setRealmName(getRealmName(realmId));
        realm.setType(randomRealmType());
        realm.setLevel((int)(Math.random() * 100) + 1);
        realm.setStatus(SecretRealm.RealmStatus.EXPLORING);
        realm.setEnterTime(System.currentTimeMillis());
        realm.setExplorationProgress(0);
        
        SecretRealm.RealmBoss boss = new SecretRealm.RealmBoss();
        boss.setBossId(UUID.randomUUID().toString());
        boss.setBossName("秘境守护者");
        boss.setLevel(realm.getLevel());
        boss.setHp(realm.getLevel() * 10000L);
        boss.setDefeated(false);
        realm.setBoss(boss);
        
        return secretRealmRepository.save(realm);
    }
    
    public SecretRealm exploreSecretRealm(long userId, String realmId) {
        SecretRealm realm = secretRealmRepository.findByUserIdAndRealmId(userId, realmId);
        if (realm != null) {
            SecretRealm.RealmDiscovery discovery = new SecretRealm.RealmDiscovery();
            discovery.setDiscoveryId(UUID.randomUUID().toString());
            discovery.setName("发现 #" + (realm.getDiscoveries().size() + 1));
            discovery.setType(randomDiscoveryType());
            discovery.setTimestamp(System.currentTimeMillis());
            realm.getDiscoveries().add(discovery);
            realm.setExplorationProgress(realm.getExplorationProgress() + 10);
            
            if (realm.getExplorationProgress() >= 100) {
                realm.setStatus(SecretRealm.RealmStatus.BOSS_FIGHT);
            }
            return secretRealmRepository.save(realm);
        }
        return null;
    }
    
    public SecretRealm challengeRealmBoss(long userId, String realmId, boolean victory) {
        SecretRealm realm = secretRealmRepository.findByUserIdAndRealmId(userId, realmId);
        if (realm != null && realm.getStatus() == SecretRealm.RealmStatus.BOSS_FIGHT) {
            if (victory) {
                realm.getBoss().setDefeated(true);
                realm.getBoss().setDefeatTime(System.currentTimeMillis());
                realm.setStatus(SecretRealm.RealmStatus.CLEARED);
                realm.setExitTime(System.currentTimeMillis());
                generateRealmReward(realm);
            }
            return secretRealmRepository.save(realm);
        }
        return null;
    }
    
    // ========== 辅助方法 ==========
    
    private String getDungeonName(String dungeonId) {
        if (dungeonId == null) {
            return "未知副本";
        }
        Map<String, String> names = Map.of(
            "shadow_forest", "暗影森林",
            "flame_forge", "烈焰熔炉",
            "frozen_temple", "冰封神殿",
            "dragon_lair", "龙之巢穴"
        );
        return names.getOrDefault(dungeonId, "未知副本");
    }
    
    private Dungeon.DungeonType getDungeonType(String dungeonId) {
        return Dungeon.DungeonType.STORY;
    }
    
    private int getMaxStages(String dungeonId) {
        return 5;
    }
    
    private void generateDungeonReward(Dungeon dungeon) {
        Dungeon.DungeonReward reward = new Dungeon.DungeonReward();
        reward.setExp(dungeon.getDifficulty() * 1000);
        reward.setGold(dungeon.getDifficulty() * 500);
        reward.setTitle("副本征服者");
        reward.setAchievement("dungeon_master");
        dungeon.setReward(reward);
    }
    
    private void generateExplorationReward(Exploration exploration) {
        Exploration.ExplorationReward reward = new Exploration.ExplorationReward();
        reward.setExp(500);
        reward.setGold(300);
        reward.getDiscoveries().add("新地点");
        exploration.setReward(reward);
    }
    
    private Exploration.ExplorationEvent generateRandomEvent() {
        Exploration.ExplorationEvent event = new Exploration.ExplorationEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setEventType("遭遇");
        event.setDescription("遇到了神秘的旅行者");
        event.setTimestamp(System.currentTimeMillis());
        return event;
    }
    
    private TreasureHunt.TreasureRarity randomRarity() {
        double rand = Math.random();
        if (rand < 0.4) return TreasureHunt.TreasureRarity.COMMON;
        if (rand < 0.7) return TreasureHunt.TreasureRarity.UNCOMMON;
        if (rand < 0.85) return TreasureHunt.TreasureRarity.RARE;
        if (rand < 0.95) return TreasureHunt.TreasureRarity.EPIC;
        if (rand < 0.99) return TreasureHunt.TreasureRarity.LEGENDARY;
        return TreasureHunt.TreasureRarity.MYTHIC;
    }
    
    private void generateTreasureChest(TreasureHunt hunt) {
        TreasureHunt.TreasureChest chest = new TreasureHunt.TreasureChest();
        chest.setChestId(UUID.randomUUID().toString());
        chest.setRarity(hunt.getRarity());
        chest.setLocked(false);
        chest.setGold((int)(Math.random() * 1000) + 100);
        chest.setGems((int)(Math.random() * 50) + 10);
        hunt.setChest(chest);
    }
    
    private TimeRift.RiftType randomRiftType() {
        TimeRift.RiftType[] types = TimeRift.RiftType.values();
        return types[(int)(Math.random() * types.length)];
    }
    
    private void generateRiftReward(TimeRift rift) {
        TimeRift.RiftReward reward = new TimeRift.RiftReward();
        reward.setExp(rift.getLevel() * 100);
        reward.setGold(rift.getLevel() * 50);
        reward.setTimeFragments((int)(Math.random() * 10) + 1);
        rift.setReward(reward);
    }
    
    private SecretRealm.RealmType randomRealmType() {
        SecretRealm.RealmType[] types = SecretRealm.RealmType.values();
        return types[(int)(Math.random() * types.length)];
    }
    
    private String getRealmName(String realmId) {
        return "秘境 #" + realmId;
    }
    
    private String randomDiscoveryType() {
        String[] types = {"宝箱", "遗迹", "神器", "传送门", "NPC"};
        return types[(int)(Math.random() * types.length)];
    }
    
    private void generateRealmReward(SecretRealm realm) {
        SecretRealm.RealmReward reward = new SecretRealm.RealmReward();
        reward.setExp(realm.getLevel() * 200);
        reward.setGold(realm.getLevel() * 100);
        reward.setRealmEssence((int)(Math.random() * 20) + 5);
        reward.setTitle("秘境探索者");
        realm.setReward(reward);
    }
}

