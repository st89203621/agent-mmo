package com.iohao.mmo.rebirth.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.rebirth.cmd.RebirthCmd;
import com.iohao.mmo.rebirth.entity.PlayerWorld;
import com.iohao.mmo.rebirth.entity.PlayerWorld.WorldRecord;
import com.iohao.mmo.rebirth.proto.GetPoemRequest;
import com.iohao.mmo.rebirth.proto.PlayerWorldMessage;
import com.iohao.mmo.rebirth.proto.SelectWorldRequest;
import com.iohao.mmo.rebirth.proto.WorldHistoryMessage;
import com.iohao.mmo.rebirth.service.RebirthService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@ActionController(RebirthCmd.cmd)
public class RebirthAction {

    @Resource
    RebirthService rebirthService;

    @ActionMethod(RebirthCmd.getCurrentWorld)
    public PlayerWorldMessage getCurrentWorld(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PlayerWorld playerWorld = rebirthService.getCurrentWorld(userId);
        return toPlayerWorldMessage(playerWorld);
    }

    @ActionMethod(RebirthCmd.getWorldHistory)
    public List<WorldHistoryMessage> getWorldHistory(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PlayerWorld playerWorld = rebirthService.getCurrentWorld(userId);
        List<WorldHistoryMessage> result = new ArrayList<>();
        if (Objects.nonNull(playerWorld.getWorlds())) {
            for (WorldRecord record : playerWorld.getWorlds()) {
                result.add(toWorldHistoryMessage(record));
            }
        }
        return result;
    }

    @ActionMethod(RebirthCmd.selectNextWorld)
    public PlayerWorldMessage selectNextWorld(SelectWorldRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        rebirthService.selectNextBook(userId, request.bookId, request.bookTitle);
        PlayerWorld playerWorld = rebirthService.getCurrentWorld(userId);
        return toPlayerWorldMessage(playerWorld);
    }

    @ActionMethod(RebirthCmd.doRebirth)
    public PlayerWorldMessage doRebirth(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PlayerWorld playerWorld = rebirthService.doRebirth(userId, flowContext);
        return toPlayerWorldMessage(playerWorld);
    }

    @ActionMethod(RebirthCmd.getRebirthPoem)
    public String getRebirthPoem(GetPoemRequest request) {
        return rebirthService.generateRebirthPoem(request.worldIndex, request.fromBook, request.toBook);
    }

    private PlayerWorldMessage toPlayerWorldMessage(PlayerWorld playerWorld) {
        PlayerWorldMessage msg = new PlayerWorldMessage();
        msg.userId = playerWorld.getId();
        msg.currentWorldIndex = playerWorld.getCurrentWorldIndex();
        msg.totalRebirths = playerWorld.getTotalRebirths();

        WorldRecord currentRecord = playerWorld.getCurrentWorldRecord();
        if (Objects.nonNull(currentRecord)) {
            msg.currentBookId = currentRecord.getBookId() != null ? currentRecord.getBookId() : "";
            msg.currentBookTitle = currentRecord.getBookTitle() != null ? currentRecord.getBookTitle() : "";
        }
        return msg;
    }

    private WorldHistoryMessage toWorldHistoryMessage(WorldRecord record) {
        WorldHistoryMessage msg = new WorldHistoryMessage();
        msg.worldIndex = record.getWorldIndex();
        msg.bookId = record.getBookId() != null ? record.getBookId() : "";
        msg.bookTitle = record.getBookTitle() != null ? record.getBookTitle() : "";
        msg.enterTime = record.getEnterTime();
        msg.exitTime = record.getExitTime();
        msg.finalFatePoints = record.getFinalFateScore();
        msg.rebirthPoem = record.getRebirthPoem() != null ? record.getRebirthPoem() : "";
        return msg;
    }
}
