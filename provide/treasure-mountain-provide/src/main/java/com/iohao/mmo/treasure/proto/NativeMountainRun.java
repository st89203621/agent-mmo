package com.iohao.mmo.treasure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import java.util.List;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeMountainRun {
    public String sessionId;
    public int mountain;
    public String prompt;
    public List<String> options;
    public int progress;
    public int goal;
    public int enemyHp;
    public int enemyMaxHp;
    public int playerHp;
    public int playerMaxHp;
    public long remainingMs;
    public long cooldownMs;
    public boolean completed;
    public boolean failed;
    public boolean claimed;
    public long rewardCoins;
    public long rewardHonor;
    public int cellX;
    public int cellY;
    public List<Integer> mazeWalls;
    public int rewardGoldenBeans;
}
