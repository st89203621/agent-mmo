package com.iohao.mmo.treasure.service;

import com.iohao.mmo.treasure.entity.MountainSession;
import org.junit.Test;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import static org.junit.Assert.*;

public class NativeMountainRulesTest {
    @Test
    public void generatedMazeHasNoBoundaryEscapesAndEveryCellIsReachable() {
        for (int seed = 0; seed < 100; seed++) {
            List<Integer> walls = NativeMountainRules.maze(new Random(seed));
            Set<Integer> visited = new HashSet<>();
            ArrayDeque<Integer> queue = new ArrayDeque<>(); queue.add(0);
            int[] dx = { 0, 1, 0, -1 }, dy = { -1, 0, 1, 0 };
            while (!queue.isEmpty()) {
                int cell = queue.remove(); if (!visited.add(cell)) continue;
                for (int direction = 0; direction < 4; direction++) {
                    if ((walls.get(cell) & (1 << direction)) != 0) continue;
                    int x = cell % 4 + dx[direction], y = cell / 4 + dy[direction];
                    assertTrue(x >= 0 && x < 4 && y >= 0 && y < 4);
                    int next = y * 4 + x;
                    assertEquals(0, walls.get(next) & (1 << ((direction + 2) % 4)));
                    queue.add(next);
                }
            }
            assertEquals(16, visited.size());
        }
    }

    @Test
    public void quizRequiresFourConsecutiveAnswersAndCannotProgressAfterCompletion() {
        MountainSession session = start(0);
        Random random = new Random(2);
        NativeMountainRules.act(session, session.getNativeCorrectChoice(), 2000, random);
        assertEquals(1, session.getNativeProgress());
        NativeMountainRules.act(session, (session.getNativeCorrectChoice() + 1) % 3, 3000, random);
        assertEquals(0, session.getNativeProgress());
        for (int i = 0; i < 4; i++) NativeMountainRules.act(session, session.getNativeCorrectChoice(), 4000 + i * 1000, random);
        assertEquals("COMPLETED", session.getNativeStatus());
        NativeMountainRules.act(session, 0, 9000, random);
        assertEquals(4, session.getNativeProgress());
    }

    @Test
    public void cooldownPreventsRepeatedDamageAndDefenseCountersTelegraph() {
        MountainSession session = start(4);
        NativeMountainRules.act(session, 0, 2000, new Random());
        int hp = session.getNativeEnemyHp(), turn = session.getNativeTurn();
        NativeMountainRules.act(session, 0, 2001, new Random());
        assertEquals(hp, session.getNativeEnemyHp()); assertEquals(turn, session.getNativeTurn());
        session.setNativeTurn(2);
        int playerHp = session.getNativePlayerHp();
        NativeMountainRules.act(session, 1, 3000, new Random());
        assertTrue(playerHp - session.getNativePlayerHp() < session.getNativePlayerMaxHp() / 10);
    }

    @Test
    public void captureRequiresThreeWavesAndServerElapsedTime() {
        MountainSession session = start(3);
        long now = 2000;
        while (session.getNativeProgress() < 3) {
            NativeMountainRules.act(session, session.getNativeTurn() % 3 == 2 ? 1 : session.getNativeTurn() % 3 == 0 ? 2 : 0,
                    now, new Random());
            now += 601;
        }
        assertEquals("ACTIVE", session.getNativeStatus());
        NativeMountainRules.act(session, 1, 21000, new Random());
        assertEquals("COMPLETED", session.getNativeStatus());
    }

    @Test
    public void pirateCanCompleteOrLoseHullAndExpiredRunsCannotAct() {
        MountainSession session = start(5);
        for (int i = 0; i < 5; i++) NativeMountainRules.act(session, session.getNativeCorrectChoice(), 2000 + i * 1000, new Random(i));
        assertEquals("COMPLETED", session.getNativeStatus());
        session = start(5);
        for (int i = 0; i < 4; i++) NativeMountainRules.act(session, (session.getNativeCorrectChoice() + 1) % 3, 2000 + i * 1000, new Random(i));
        assertEquals("FAILED", session.getNativeStatus());
        session = start(2);
        int enemyHp = session.getNativeEnemyHp();
        NativeMountainRules.act(session, 0, session.getNativeExpiresAt(), new Random());
        assertEquals("FAILED", session.getNativeStatus()); assertEquals(enemyHp, session.getNativeEnemyHp());
    }

    private MountainSession start(int mountain) {
        MountainSession session = new MountainSession();
        NativeMountainRules.start(session, mountain, 1000, 100, 1000, new Random(1));
        return session;
    }
}
