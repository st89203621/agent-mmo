package com.iohao.mmo.guild.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import java.util.List;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeGuildState {
    public boolean success;
    public String message;
    public GuildMessage guild;
    public List<GuildMessage> guilds;
    public List<GuildMemberMessage> members;
    public long contribution;
    public long honor;
    public long construction;
    public long createCost;
    public long donationCost;
}
