package com.iohao.mmo.adventure.service;

import com.iohao.mmo.adventure.entity.NativeAdventureProgress;
import com.iohao.mmo.adventure.entity.NativeSubmapProgress;
import com.iohao.mmo.adventure.proto.*;
import com.iohao.mmo.equip.entity.EquipLoadout;
import com.iohao.mmo.equip.service.EquipService;
import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.service.LevelService;
import com.iohao.mmo.person.entity.BasicProperty;
import com.iohao.mmo.person.entity.Person;
import com.iohao.mmo.person.service.PersonService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NativeAdventureServiceTest {
    private MongoTemplate mongo;
    private PersonService people;
    private LevelService levels;
    private EquipService equipment;
    private NativeAdventureRewards rewards;
    private NativeAdventureService service;
    private AtomicLong now;
    private final List<NativeRewardMessage> granted = new ArrayList<>();

    @BeforeEach
    void setup() {
        mongo = mock(MongoTemplate.class); people = mock(PersonService.class); levels = mock(LevelService.class);
        equipment = mock(EquipService.class); rewards = mock(NativeAdventureRewards.class); now = new AtomicLong(100_000);
        when(mongo.save(any())).thenAnswer(call -> call.getArgument(0));
        when(people.getPersonById(anyLong())).thenAnswer(call -> {
            Person person = new Person(); person.setId(call.getArgument(0)); person.setName("测试旅人"); person.setProfession("ATTACK");
            BasicProperty stats = new BasicProperty(); stats.setHp(100); stats.setPhysicsAttack(300); stats.setPhysicsDefense(10);
            person.setBasicProperty(stats); return person;
        });
        when(levels.ofLevel(anyLong())).thenAnswer(call -> { Level level = new Level(); level.setId(call.getArgument(0)); level.setLevel(25); return level; });
        when(equipment.loadout(anyLong())).thenReturn(new EquipLoadout());
        when(rewards.drain(any())).thenAnswer(call -> {
            NativeAdventureProgress progress = call.getArgument(0);
            List<NativeRewardMessage> batch = progress.pendingRewards.stream().map(grant -> NativeAdventureRewards.message(progress.userId,grant)).toList();
            granted.addAll(batch); progress.pendingRewards.clear(); return batch;
        });
        service = new NativeAdventureService(mongo,people,levels,equipment,rewards,now::get);
    }

    @Test
    void rejectsTeleportNonfiniteCoordinatesWrongWorldAndReplayMovement() {
        enter(1,1);
        NativeMoveRequest move = move(1,1,1000,1000);
        assertFalse(service.move(1,move).accepted);
        move.x = Float.NaN; assertFalse(service.move(1,move).accepted);
        move.x = 0; move.z = .5f; move.realm = 2; assertFalse(service.move(1,move).accepted);
        move.realm = 1; assertTrue(service.move(1,move).accepted);
        move.x = 10;
        NativeWorldSnapshot replay = service.move(1,move);
        assertTrue(replay.accepted); assertEquals(0,replay.x); assertEquals(.5f,replay.z);
    }

    @Test
    void movementBudgetDoesNotGrowBySendingManySmallRequests() {
        enter(1,0);
        int accepted = 0;
        for(int i=1;i<=100;i++) if(service.move(1,move(0,i,-.65f,i*.1f)).accepted) accepted++;
        assertTrue(accepted <= 11);
        assertTrue(service.snapshot(1).z <= 1.1f);
        assertFalse(NativeAdventureService.pathValid(0,-20,76,-20,82));
        assertTrue(NativeAdventureService.pathValid(0,0,76,0,82));
    }

    @Test
    void attackChecksRangeWorldCooldownAndDoesNotRewardReplayedKills() {
        NativeWorldSnapshot initial = enter(1,1);
        String id = initial.enemies.getFirst().id;
        NativeCombatRequest action = attack(1,1,id);
        assertFalse(service.action(1,action).accepted);
        walk(1,1,-3,20);
        action.realm = 2; assertFalse(service.action(1,action).accepted);
        action.realm = 1;
        NativeWorldSnapshot killed = service.action(1,action);
        assertTrue(killed.accepted); assertEquals(0,killed.enemies.getFirst().health); assertEquals(1,killed.rewards.size());
        assertEquals(60,killed.rewards.getFirst().gold);
        assertTrue(service.action(1,action).rewards.isEmpty());
        action.sequence = 2; assertFalse(service.action(1,action).accepted);
        assertEquals(1,granted.size());
    }

    @Test
    void villageMemoriesAndChestAreServerGatedAndSurviveReconnect() {
        enter(1,0);
        walk(1,0,0,104);
        NativeInteractRequest request = interaction(0,"chest");
        assertFalse(service.interact(1,request).accepted);
        for(int i=0;i<3;i++) {
            walk(1,0,NativeAdventureCatalog.memoryX(0,i),NativeAdventureCatalog.memoryZ(0,i));
            request.targetId = "memory-"+i;
            assertEquals(1,service.interact(1,request).rewards.size());
            assertTrue(service.interact(1,request).rewards.isEmpty());
        }
        walk(1,0,0,104); request.targetId = "chest";
        NativeWorldSnapshot opened = service.interact(1,request);
        assertTrue(opened.accepted); assertEquals(7,opened.memoryMask); assertEquals(1,opened.treasureMask); assertEquals(1,opened.rewards.size());
        service.leave(1);
        NativeWorldRequest resume = new NativeWorldRequest(); resume.resume = true;
        NativeWorldSnapshot reconnected = service.enter(1,resume);
        assertEquals(1,reconnected.treasureMask); assertTrue(service.interact(1,request).rewards.isEmpty());
        assertEquals(4,granted.size());
    }

    @Test
    void sharedEnemyDeathIsVisibleToAnotherRealPlayerAndPresenceExpires() {
        enter(1,1); enter(2,1);
        assertEquals(1,service.snapshot(1).players.size());
        walk(1,1,-3,20);
        service.action(1,attack(1,1,"realm-1-enemy-0"));
        assertEquals(0,service.snapshot(2).enemies.getFirst().health);
        assertTrue(service.snapshot(2).rewards.isEmpty());
        now.addAndGet(46_000); service.tick();
        assertTrue(service.snapshot(1).players.isEmpty());
    }

    @Test
    void artificialClientVictoryCannotOpenBossChestOrHealBySwitchingRealms() {
        enter(1,1);
        walk(1,1,0,104);
        assertFalse(service.interact(1,interaction(1,"chest")).accepted);
        assertFalse(service.action(1,attack(1,1,"victory")).accepted);
        assertFalse(service.revive(1).accepted);
        assertEquals(0,service.snapshot(1).bossMask);
        assertTrue(granted.isEmpty());
    }

    @Test
    void serverEnemyWindupDamagesAndDodgePreventsItsImpact() {
        enter(1,1);
        walk(1,1,-3,22);
        service.tick();
        NativeWorldSnapshot casting = service.snapshot(1);
        assertTrue(casting.enemies.getFirst().castEndsAt > now.get());
        int health = casting.health;
        now.addAndGet(800); service.tick();
        assertTrue(service.snapshot(1).health < health);
        now.addAndGet(2000); service.tick();
        now.addAndGet(400);
        NativeCombatRequest dodge = attack(1,1,""); dodge.action="dodge";
        assertTrue(service.action(1,dodge).accepted);
        int afterHit = service.snapshot(1).health;
        now.addAndGet(400); service.tick();
        assertEquals(afterHit,service.snapshot(1).health);
        NativeWorldRequest change = new NativeWorldRequest(); change.realm=0;
        assertFalse(service.enter(1,change).accepted);
    }

    @Test
    void freshPlayerCannotEnterHigherLevelWorld() {
        Level level = new Level(); level.setId(1); level.setLevel(1);
        when(levels.ofLevel(1)).thenReturn(level);
        assertFalse(enter(1,5).accepted);
        NativeWorldSnapshot village = enter(1,0);
        assertEquals(0,village.realm);
        assertEquals((1 << 0) | (1 << 1) | (1 << 6),village.unlockedRealmMask);
    }

    @Test
    void submapsRequirePreviousChestAndKeepBaseWorldLevelAccess() {
        assertFalse(enter(1,0,1).accepted);
        assertFalse(enter(1,0,2).accepted);
        assertFalse(enter(1,3,1).accepted);
        assertFalse(enter(1,1,-1).accepted);
        assertFalse(enter(1,1,3).accepted);
        assertEquals(1,service.snapshot(1).unlockedSubmapMask);
        assertTrue(enter(1,1).accepted);

        NativeAdventureProgress saved = unlocked(2,0);
        NativeWorldSnapshot second = enter(2,0,1);
        assertTrue(second.accepted); assertEquals(3,second.unlockedSubmapMask);
        assertEquals("落樱长堤",second.submapName); assertEquals(5,second.enemies.size());
        assertFalse(enter(2,0,2).accepted);
        NativeSubmapProgress completed = new NativeSubmapProgress(); completed.treasureCollected = true;
        saved.submaps.put("0_1", completed);
        NativeWorldSnapshot third = enter(2,0,2);
        assertTrue(third.accepted); assertEquals(7,third.unlockedSubmapMask);

        Level low = new Level(); low.setId(3); low.setLevel(1);
        when(levels.ofLevel(3)).thenReturn(low);
        unlocked(3,5);
        assertFalse(enter(3,5,1).accepted);
    }

    @Test
    void submapRoomsIsolateEnemiesPlayersDamageAndEvents() {
        unlocked(1,1); unlocked(2,1); unlocked(3,1);
        enter(1,1,1); enter(2,1,0); enter(3,1,1);
        assertEquals(List.of(3L),service.snapshot(1).players.stream().map(player -> player.userId).toList());
        assertTrue(service.snapshot(2).players.isEmpty());
        walk(1,1,-3,20);
        walk(2,1,-3,20);
        walk(3,1,-3,20);
        NativeCombatRequest attack = attack(1,1,"realm-1-submap-1-enemy-0"); attack.submap = 1;
        NativeWorldSnapshot killed = service.action(1,attack);
        assertTrue(killed.accepted); assertEquals(0,killed.enemies.getFirst().health);
        assertEquals(1,killed.submapKills); assertEquals(0,killed.realmKills.get(1));
        NativeWorldSnapshot otherRoom = service.snapshot(2);
        assertTrue(otherRoom.enemies.getFirst().health > 0); assertTrue(otherRoom.events.isEmpty());
        assertEquals(0,service.snapshot(3).enemies.getFirst().health);
        assertTrue(service.snapshot(3).rewards.isEmpty());
        assertTrue(service.action(1,attack).rewards.isEmpty());

        service.leave(2);
        int baseHealth = service.snapshot(2).health;
        now.addAndGet(36_000); service.snapshot(1); service.tick();
        service.tick(); now.addAndGet(800); service.tick();
        assertEquals(baseHealth,service.snapshot(2).health);
    }

    @Test
    void staleSubmapRequestsAreRejectedEvenWhenTheirSequenceWasAcknowledged() {
        unlocked(1,1); enter(1,1,1);
        NativeMoveRequest move = move(1,1,-.65f,.5f); move.submap = 1;
        assertTrue(service.move(1,move).accepted);
        move.submap = 0;
        assertFalse(service.move(1,move).accepted);
        NativeCombatRequest dodge = attack(1,1,""); dodge.submap = 1; dodge.action = "dodge";
        assertTrue(service.action(1,dodge).accepted);
        dodge.submap = 0;
        assertFalse(service.action(1,dodge).accepted);
        walk(1,1,-7,14);
        NativeInteractRequest memory = interaction(1,"memory-0");
        assertFalse(service.interact(1,memory).accepted);
        memory.submap = 1;
        assertEquals(1,service.interact(1,memory).rewards.size());
        assertTrue(service.interact(1,memory).rewards.isEmpty());
    }

    @Test
    void submapCollectionPersistsIndependentlyAndResumeRestoresItsRoom() {
        NativeAdventureProgress saved = unlocked(1,1);
        saved.memoryMask = 7 << 3;
        saved.realmKills.set(1,4);
        saved.bossMask = 1 << 1;
        enter(1,1,1);
        for(int i=0;i<3;i++) {
            walk(1,1,NativeAdventureCatalog.memoryX(1,i),NativeAdventureCatalog.memoryZ(1,i));
            NativeInteractRequest memory = interaction(1,"memory-"+i); memory.submap=1;
            assertEquals(1,service.interact(1,memory).rewards.size());
            assertTrue(service.interact(1,memory).rewards.isEmpty());
        }
        NativeWorldSnapshot current = service.snapshot(1);
        assertEquals(7,current.submapMemoryMask); assertEquals(7 << 3,current.memoryMask);
        assertEquals(0,current.submapKills); assertEquals(4,current.realmKills.get(1));
        assertFalse(current.submapBossDefeated); assertFalse(current.submapTreasureCollected);
        assertFalse(current.landmarks.getLast().available);
        service.leave(1);
        service = new NativeAdventureService(mongo,people,levels,equipment,rewards,now::get);
        NativeWorldRequest resume = new NativeWorldRequest(); resume.resume=true;
        NativeWorldSnapshot restored=service.enter(1,resume);
        assertTrue(restored.accepted); assertEquals(1,restored.realm); assertEquals(1,restored.submap);
        assertEquals(current.x,restored.x); assertEquals(current.z,restored.z); assertEquals(7,restored.submapMemoryMask);
        assertEquals(3,granted.size());
    }

    @Test
    void combatSubmapChestRequiresMemoriesBeforeRewardAndNextMapUnlock() {
        NativeAdventureProgress saved = unlocked(1,0);
        enter(1,0,1);
        for(int i=0;i<5;i++) {
            walk(1,0,NativeAdventureCatalog.enemyX(i),NativeAdventureCatalog.enemyZ(0,i));
            while(service.snapshot(1).enemies.get(i).health>0) {
                NativeCombatRequest attack=attack(0,service.snapshot(1).lastActionSequence+1,"realm-0-submap-1-enemy-"+i); attack.submap=1;
                now.addAndGet(600);
                assertTrue(service.action(1,attack).accepted);
            }
        }
        walk(1,0,0,104);
        NativeInteractRequest chest=interaction(0,"chest");chest.submap=1;
        int beforeRewards=granted.size();
        long beforeSequence=saved.rewardSequence;
        NativeWorldSnapshot blocked=service.interact(1,chest);
        assertFalse(blocked.accepted);assertTrue(blocked.message.contains("三份回忆"));
        assertTrue(blocked.submapBossDefeated);assertEquals(4,blocked.submapKills);assertEquals(0,blocked.submapMemoryMask);
        assertFalse(blocked.submapTreasureCollected);assertTrue(blocked.rewards.isEmpty());
        assertEquals(3,blocked.unlockedSubmapMask);assertFalse(enter(1,0,2).accepted);
        assertEquals(beforeRewards,granted.size());assertEquals(beforeSequence,saved.rewardSequence);
        for(int i=0;i<3;i++) {
            walk(1,0,NativeAdventureCatalog.memoryX(0,i),NativeAdventureCatalog.memoryZ(0,i));
            NativeInteractRequest memory=interaction(0,"memory-"+i);memory.submap=1;
            NativeWorldSnapshot collectedMemory=service.interact(1,memory);
            assertTrue(collectedMemory.accepted);assertEquals(1,collectedMemory.rewards.size());
            assertEquals(i==2,collectedMemory.landmarks.getLast().available);
        }
        walk(1,0,0,104);
        NativeWorldSnapshot collected=service.interact(1,chest);
        assertTrue(collected.accepted);assertTrue(collected.submapTreasureCollected);assertTrue(collected.submapBossDefeated);
        assertEquals(7,collected.submapMemoryMask);assertEquals(1,collected.rewards.size());assertEquals(800,collected.rewards.getFirst().gold);
        assertEquals(4,collected.submapKills);assertEquals(7,collected.unlockedSubmapMask);
        assertEquals(1,collected.treasureMask);assertEquals(0,collected.bossMask);assertEquals(0,collected.realmKills.get(0));
        assertTrue(service.interact(1,chest).rewards.isEmpty());
        assertTrue(saved.submaps.get("0_1").treasureCollected);
        assertTrue(enter(1,0,2).accepted);
        assertFalse(service.snapshot(1).submapTreasureCollected);
    }

    @Test
    void allMapSnapshotProjectsSavedMemoriesUnlocksAndReservedSlotsAfterRestart() {
        NativeAdventureProgress saved=unlocked(1,0);
        saved.treasureMask=(1<<0)|(1<<2)|(1<<5)|(1<<6);
        saved.memoryMask=7|(3<<6)|(5<<18);
        NativeSubmapProgress first=new NativeSubmapProgress();first.memoryMask=9;first.treasureCollected=true;
        NativeSubmapProgress second=new NativeSubmapProgress();second.memoryMask=-1;
        NativeSubmapProgress sea=new NativeSubmapProgress();sea.memoryMask=2;
        NativeSubmapProgress cloud=new NativeSubmapProgress();cloud.memoryMask=4;cloud.treasureCollected=true;
        NativeSubmapProgress water=new NativeSubmapProgress();water.memoryMask=6;
        NativeSubmapProgress reserved=new NativeSubmapProgress();reserved.memoryMask=7;reserved.treasureCollected=true;
        saved.submaps.put("0_1",first);saved.submaps.put("0_2",second);saved.submaps.put("2_2",sea);
        saved.submaps.put("5_1",cloud);saved.submaps.put("6_1",water);saved.submaps.put("3_1",reserved);
        Level level=new Level();level.setId(1);level.setLevel(8);
        when(levels.ofLevel(1)).thenReturn(level);
        var keys=java.util.Set.copyOf(saved.submaps.keySet());

        NativeWorldSnapshot original=enter(1,0);
        assertEquals(List.of(7,1,7,0,0,0,3,0,2,0,0,0,0,0,0,0,4,0,5,6,0),original.mapMemoryMasks);
        assertEquals((1<<0)|(1<<1)|(1<<2)|(1<<3)|(1<<6)|(1<<7)|(1<<9)|(1<<18)|(1<<19),original.unlockedMapMask);
        assertEquals(keys,saved.submaps.keySet(),"Reading all-map state must not create unvisited submap entries");
        service.leave(1);
        service=new NativeAdventureService(mongo,people,levels,equipment,rewards,now::get);
        NativeWorldRequest resume=new NativeWorldRequest();resume.resume=true;
        NativeWorldSnapshot restored=service.enter(1,resume);
        assertTrue(restored.accepted);assertEquals(original.mapMemoryMasks,restored.mapMemoryMasks);
        assertEquals(original.unlockedMapMask,restored.unlockedMapMask);assertEquals(keys,saved.submaps.keySet());
    }

    @Test
    void submapCombatLockAndGeometryMatchTheClientCatalog() {
        NativeAdventureProgress saved=unlocked(1,1);
        NativeSubmapProgress completed=new NativeSubmapProgress();completed.treasureCollected=true;saved.submaps.put("1_1",completed);
        enter(1,1,1);walk(1,1,-3,22);service.tick();now.addAndGet(800);service.tick();
        assertFalse(enter(1,1,2).accepted);
        service.leave(1);now.addAndGet(5100);
        assertTrue(enter(1,1,2).accepted);
        for(int realm=0;realm<7;realm++) for(int submap=0;submap<NativeAdventureCatalog.submapCount(realm);submap++) {
            assertTrue(NativeAdventureCatalog.positionValid(realm,submap,-.65f,0));
            assertEquals(NativeAdventureCatalog.enemyZ(realm,4),NativeAdventureCatalog.enemyZ(realm,submap,4));
            assertEquals(NativeAdventureCatalog.chestZ(realm),NativeAdventureCatalog.chestZ(realm,submap));
            assertEquals(NativeAdventureCatalog.positionValid(realm,-20,79),NativeAdventureCatalog.positionValid(realm,submap,-20,79));
        }
    }

    private NativeWorldSnapshot enter(long user,int realm) { NativeWorldRequest request=new NativeWorldRequest(); request.realm=realm; return service.enter(user,request); }
    private NativeWorldSnapshot enter(long user,int realm,int submap) { NativeWorldRequest request=new NativeWorldRequest(); request.realm=realm;request.submap=submap; return service.enter(user,request); }
    private NativeAdventureProgress unlocked(long user,int realm) {
        NativeAdventureProgress saved=new NativeAdventureProgress();saved.userId=user;saved.treasureMask=1<<realm;
        when(mongo.findById(user,NativeAdventureProgress.class)).thenReturn(saved);
        return saved;
    }
    private static NativeMoveRequest move(int realm,long sequence,float x,float z) { NativeMoveRequest r=new NativeMoveRequest();r.realm=realm;r.sequence=sequence;r.x=x;r.z=z;return r; }
    private static NativeCombatRequest attack(int realm,long sequence,String id) { NativeCombatRequest r=new NativeCombatRequest();r.realm=realm;r.sequence=sequence;r.action="attack";r.targetId=id;return r; }
    private static NativeInteractRequest interaction(int realm,String id) { NativeInteractRequest r=new NativeInteractRequest();r.realm=realm;r.targetId=id;return r; }
    private void walk(long user,int realm,float x,float z) {
        NativeWorldSnapshot start=service.snapshot(user);
        int steps=Math.max(1,(int)Math.ceil(Math.hypot(x-start.x,z-start.z)/2));
        for(int i=1;i<=steps;i++) { now.addAndGet(500); NativeMoveRequest request=move(realm,start.lastMoveSequence+i,start.x+(x-start.x)*i/steps,start.z+(z-start.z)*i/steps);request.submap=start.submap;
            NativeWorldSnapshot moved=service.move(user,request); assertTrue(moved.accepted,moved.message); }
    }
}
