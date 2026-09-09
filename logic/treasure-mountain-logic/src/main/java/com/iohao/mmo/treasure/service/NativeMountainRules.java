package com.iohao.mmo.treasure.service;

import com.iohao.mmo.treasure.entity.MountainSession;
import com.iohao.mmo.treasure.proto.NativeMountainRun;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/** Pure server rules; hidden puzzle answers are never copied into response messages. */
public final class NativeMountainRules {
    public static final String[] NAMES = { "智宝山", "文宝山", "珍宝山", "藏宝山", "龙宝山", "海盗宝山" };
    public static final String[] DESCRIPTIONS = { "连续答对四题，解开书灵封印", "穿过曲折迷宫，抵达东南出口",
            "挑战守山护法，观察蓄力后防守", "抵御三波守卫，守住阵眼二十秒", "识破龙息节奏，击败山巅巨龙", "辨认航海线索，驶向五处宝藏航标" };
    private static final String[] DIRECTIONS = { "北", "东", "南", "西" };
    private static final int[] DX = { 0, 1, 0, -1 };
    private static final int[] DY = { -1, 0, 1, 0 };
    private static final String[][] QUIZ = {
            { "月亮本身会发光吗？", "不会，月光来自反射太阳光", "会，月亮是一颗恒星", "只有满月才会" },
            { "枫叶在秋天变红，主要与哪种色素有关？", "花青素", "叶绿素", "淀粉" },
            { "海水涨潮和退潮主要受到什么影响？", "月球和太阳的引力", "鱼群游动", "海风吹向" },
            { "指南针的指针依靠什么辨别方向？", "地磁场", "空气湿度", "云的颜色" },
            { "樱花开放后通常结出什么？", "果实", "新的树根", "冰晶" },
            { "中国古代四大发明不包括哪一项？", "望远镜", "造纸术", "指南针" },
            { "北斗七星位于哪个星座？", "大熊座", "猎户座", "天琴座" },
            { "一刻钟相当于多少分钟？", "十五分钟", "十分钟", "三十分钟" }
    };
    private static final String[][] SAIL = {
            { "海图标记宝藏在日出方向，应驶向哪里？", "东方", "西方", "原地抛锚" },
            { "前方礁石浪花翻白，哪条航线更稳妥？", "绕向深蓝水域", "直接冲向白浪", "靠近礁石停船" },
            { "风暴从北面逼近，宝图航标在南方，应怎样航行？", "转向南方避开风暴", "迎着风暴加速", "收起所有海图" },
            { "夜航时看到北极星在船尾，船正朝哪里行驶？", "南方", "北方", "天空" },
            { "潮水正退，藏宝沙洲逐渐露出，应该怎样靠岸？", "减速观察水深后靠岸", "全速冲上沙洲", "不看海图随意转向" }
    };

    private NativeMountainRules() { }

    public static void start(MountainSession s, int mountain, int hp, int attack, long now, Random random) {
        s.setNativeRunId(UUID.randomUUID().toString());
        s.setNativeMountain(mountain);
        s.setNativeStatus("ACTIVE");
        s.setNativeProgress(0);
        s.setNativeTurn(0);
        s.setNativeAttack(Math.max(10, Math.min(100000, attack)));
        s.setNativePlayerMaxHp(Math.max(100, Math.min(1000000, hp)));
        s.setNativePlayerHp(s.getNativePlayerMaxHp());
        s.setNativeStartedAt(now);
        s.setNativeExpiresAt(now + 15 * 60_000L);
        s.setNativeNextActionAt(0);
        s.setNativeCellX(0);
        s.setNativeCellY(0);
        s.setNativeMazeWalls(new ArrayList<>());
        if (mountain == 0) puzzle(s, QUIZ[random.nextInt(QUIZ.length)], random);
        else if (mountain == 1) {
            s.setNativeMazeWalls(maze(random));
            mazePrompt(s);
        } else if (mountain == 5) puzzle(s, SAIL[0], random);
        else {
            s.setNativeEnemyMaxHp(s.getNativeAttack() * (mountain == 4 ? 14 : mountain == 3 ? 4 : 7));
            s.setNativeEnemyHp(s.getNativeEnemyMaxHp());
            combatPrompt(s);
        }
    }

    public static String act(MountainSession s, int choice, long now, Random random) {
        if (!"ACTIVE".equals(s.getNativeStatus())) return "本轮挑战已结束";
        if (now >= s.getNativeExpiresAt()) { s.setNativeStatus("FAILED"); return "挑战时间已到，请重新进入"; }
        if (now < s.getNativeNextActionAt()) return "动作冷却中";
        if (choice < 0 || choice >= s.getNativeOptions().size()) return "请选择有效的行动";
        s.setNativeNextActionAt(now + 600);
        return switch (s.getNativeMountain()) {
            case 0 -> quiz(s, choice, random);
            case 1 -> move(s, choice);
            case 5 -> sail(s, choice, random);
            default -> fight(s, choice, now);
        };
    }

    private static String quiz(MountainSession s, int choice, Random random) {
        boolean correct = choice == s.getNativeCorrectChoice();
        s.setNativeProgress(correct ? s.getNativeProgress() + 1 : 0);
        if (s.getNativeProgress() == 4) s.setNativeStatus("COMPLETED");
        else puzzle(s, QUIZ[random.nextInt(QUIZ.length)], random);
        return correct ? "答对了，书灵为你点亮一盏灯" : "答案有误，灯火熄灭，请重新积累四次正确答案";
    }

    private static String sail(MountainSession s, int choice, Random random) {
        boolean correct = choice == s.getNativeCorrectChoice();
        if (correct) s.setNativeProgress(s.getNativeProgress() + 1);
        else s.setNativePlayerHp(Math.max(0, s.getNativePlayerHp() - s.getNativePlayerMaxHp() / 3));
        if (s.getNativePlayerHp() <= 0) s.setNativeStatus("FAILED");
        else if (s.getNativeProgress() >= 5) s.setNativeStatus("COMPLETED");
        else puzzle(s, SAIL[s.getNativeProgress()], random);
        return correct ? "航向正确，发现新的宝藏航标" : "船身撞上暗礁，请重新判断航向";
    }

    private static String move(MountainSession s, int choice) {
        int cell = s.getNativeCellY() * 4 + s.getNativeCellX();
        if ((s.getNativeMazeWalls().get(cell) & (1 << choice)) != 0) return "此路被石壁挡住";
        s.setNativeCellX(s.getNativeCellX() + DX[choice]);
        s.setNativeCellY(s.getNativeCellY() + DY[choice]);
        s.setNativeProgress(s.getNativeProgress() + 1);
        if (s.getNativeCellX() == 3 && s.getNativeCellY() == 3) s.setNativeStatus("COMPLETED");
        mazePrompt(s);
        return "你穿过花墙，抵达新的岔路";
    }

    private static String fight(MountainSession s, int choice, long now) {
        if (s.getNativeMountain() == 3 && s.getNativeProgress() >= 3) {
            if (now - s.getNativeStartedAt() >= 20_000) s.setNativeStatus("COMPLETED");
            return "守住阵眼，等待封印凝结";
        }
        boolean charging = s.getNativeTurn() % 3 == 2;
        if (choice == 2 && s.getNativeTurn() % 3 != 0) return "绝技需要三回合重新蓄势";
        int damage = choice == 1 ? 0 : s.getNativeAttack() * (choice == 2 ? 2 : 1);
        s.setNativeEnemyHp(Math.max(0, s.getNativeEnemyHp() - damage));
        if (s.getNativeEnemyHp() == 0) {
            s.setNativeProgress(s.getNativeProgress() + 1);
            if (s.getNativeMountain() == 3 && s.getNativeProgress() < 3) s.setNativeEnemyHp(s.getNativeEnemyMaxHp());
            else if (s.getNativeMountain() != 3 || now - s.getNativeStartedAt() >= 20_000) s.setNativeStatus("COMPLETED");
        }
        if ("ACTIVE".equals(s.getNativeStatus()) && !(s.getNativeMountain() == 3 && s.getNativeProgress() >= 3)) {
            int hit = Math.max(1, s.getNativePlayerMaxHp() / (s.getNativeMountain() == 4 ? 15 : 14));
            if (charging) hit *= 4;
            if (choice == 1) hit = Math.max(1, hit / 6);
            s.setNativePlayerHp(Math.max(0, s.getNativePlayerHp() - hit));
            if (s.getNativePlayerHp() == 0) s.setNativeStatus("FAILED");
        }
        s.setNativeTurn(s.getNativeTurn() + 1);
        combatPrompt(s);
        return choice == 1 ? "你举起护盾，削弱了来袭伤害" : "命中守卫，造成 " + damage + " 点伤害";
    }

    private static void combatPrompt(MountainSession s) {
        s.setNativeOptions(List.of("攻击", "防守", "绝技"));
        s.setNativePrompt(s.getNativeMountain() == 3 && s.getNativeProgress() >= 3 ? "三波守卫已退去，继续守住阵眼" :
                s.getNativeTurn() % 3 == 2 ? "敌人正在蓄力！本回合防守可大幅减伤" :
                s.getNativeTurn() % 3 == 0 ? "绝技已就绪，抓住空隙发起进攻" : "留意敌人的招式，下一回合将迎来重击");
    }

    private static void puzzle(MountainSession s, String[] source, Random random) {
        List<String> choices = new ArrayList<>(Arrays.asList(source).subList(1, source.length));
        Collections.shuffle(choices, random);
        s.setNativePrompt(source[0]);
        s.setNativeOptions(choices);
        s.setNativeCorrectChoice(choices.indexOf(source[1]));
    }

    private static void mazePrompt(MountainSession s) {
        int walls = s.getNativeMazeWalls().get(s.getNativeCellY() * 4 + s.getNativeCellX());
        List<String> open = new ArrayList<>();
        for (int d = 0; d < 4; d++) if ((walls & (1 << d)) == 0) open.add(DIRECTIONS[d]);
        s.setNativePrompt("花墙迷宫：第 " + (s.getNativeCellX() + 1) + " 列，第 " + (s.getNativeCellY() + 1)
                + " 行。出口位于东南角。可通行：" + String.join("、", open));
        s.setNativeOptions(Arrays.asList(DIRECTIONS));
    }

    public static List<Integer> maze(Random random) {
        int[] walls = new int[16];
        Arrays.fill(walls, 15);
        boolean[] visited = new boolean[16];
        carve(0, walls, visited, random);
        return new ArrayList<>(Arrays.stream(walls).boxed().toList());
    }

    private static void carve(int cell, int[] walls, boolean[] visited, Random random) {
        visited[cell] = true;
        List<Integer> directions = new ArrayList<>(List.of(0, 1, 2, 3));
        Collections.shuffle(directions, random);
        for (int d : directions) {
            int x = cell % 4 + DX[d], y = cell / 4 + DY[d];
            if (x < 0 || x >= 4 || y < 0 || y >= 4 || visited[y * 4 + x]) continue;
            int next = y * 4 + x;
            walls[cell] &= ~(1 << d);
            walls[next] &= ~(1 << ((d + 2) % 4));
            carve(next, walls, visited, random);
        }
    }

    public static NativeMountainRun view(MountainSession s, long now) {
        NativeMountainRun r = new NativeMountainRun();
        r.sessionId = s.getNativeRunId(); r.mountain = s.getNativeMountain();
        r.prompt = s.getNativePrompt(); r.options = s.getNativeOptions();
        r.progress = s.getNativeProgress(); r.goal = switch (r.mountain) { case 0 -> 4; case 1 -> 16; case 3 -> 3; case 5 -> 5; default -> 1; };
        r.enemyHp = s.getNativeEnemyHp(); r.enemyMaxHp = s.getNativeEnemyMaxHp();
        r.playerHp = s.getNativePlayerHp(); r.playerMaxHp = s.getNativePlayerMaxHp();
        r.remainingMs = Math.max(0, s.getNativeExpiresAt() - now);
        r.cooldownMs = Math.max(0, s.getNativeNextActionAt() - now);
        r.completed = "COMPLETED".equals(s.getNativeStatus()) || "CLAIMED".equals(s.getNativeStatus());
        r.failed = "FAILED".equals(s.getNativeStatus()); r.claimed = "CLAIMED".equals(s.getNativeStatus());
        r.rewardCoins = coins(r.mountain); r.rewardHonor = honor(r.mountain);
        r.rewardGoldenBeans = r.mountain == 3 || r.mountain == 4 ? 1 : 0;
        r.cellX = s.getNativeCellX(); r.cellY = s.getNativeCellY(); r.mazeWalls = s.getNativeMazeWalls();
        return r;
    }

    public static long coins(int mountain) { return 1200L + mountain * 300L; }
    public static long honor(int mountain) { return 10L + mountain * 5L; }
}
