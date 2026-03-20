package com.iohao.mmo.memory.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.memory.cmd.MemoryCmd;
import com.iohao.mmo.memory.entity.MemoryFragment;
import com.iohao.mmo.memory.entity.MemoryHall;
import com.iohao.mmo.memory.proto.CreateMemoryRequest;
import com.iohao.mmo.memory.proto.MemoryFragmentMessage;
import com.iohao.mmo.memory.service.MemoryService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@ActionController(MemoryCmd.cmd)
public class MemoryAction {

    @Resource
    MemoryService memoryService;

    @ActionMethod(MemoryCmd.listMemories)
    public List<MemoryFragmentMessage> listMemories(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<MemoryFragment> fragments = memoryService.listMemories(userId);
        List<MemoryFragmentMessage> result = new ArrayList<>();
        for (MemoryFragment f : fragments) {
            result.add(toMessage(f));
        }
        return result;
    }

    @ActionMethod(MemoryCmd.getMemory)
    public MemoryFragmentMessage getMemory(String fragmentId) {
        Optional<MemoryFragment> opt = memoryService.getMemory(fragmentId);
        return opt.map(this::toMessage).orElse(null);
    }

    @ActionMethod(MemoryCmd.listByWorld)
    public List<MemoryFragmentMessage> listByWorld(int worldIndex, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<MemoryFragment> fragments = memoryService.listByWorld(userId, worldIndex);
        List<MemoryFragmentMessage> result = new ArrayList<>();
        for (MemoryFragment f : fragments) {
            result.add(toMessage(f));
        }
        return result;
    }

    @ActionMethod(MemoryCmd.getMemoryHall)
    public String getMemoryHall(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        MemoryHall hall = memoryService.getOrCreateHall(userId);
        List<MemoryFragment> allFragments = memoryService.listMemories(userId);

        Map<String, Object> hallData = new HashMap<>();
        hallData.put("userId", userId);
        hallData.put("totalFragments", hall.getTotalFragments());
        hallData.put("unlockedFragments", hall.getUnlockedFragments());
        hallData.put("fragmentIds", hall.getFragmentIds());

        // 按世界分组统计
        Map<Integer, Long> worldStats = new HashMap<>();
        for (MemoryFragment f : allFragments) {
            worldStats.merge(f.getWorldIndex(), 1L, Long::sum);
        }
        hallData.put("worldStats", worldStats);

        return JSON.toJSONString(hallData);
    }

    @ActionMethod(MemoryCmd.createMemory)
    public MemoryFragmentMessage createMemory(CreateMemoryRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        MemoryFragment fragment = memoryService.createMemory(
                userId, request.npcId, request.npcName, request.worldIndex,
                request.bookTitle, request.fateScore, request.dialogueSummary);
        return toMessage(fragment);
    }

    private MemoryFragmentMessage toMessage(MemoryFragment fragment) {
        MemoryFragmentMessage msg = new MemoryFragmentMessage();
        msg.fragmentId = fragment.getId();
        msg.playerId = fragment.getPlayerId();
        msg.npcId = fragment.getNpcId() != null ? fragment.getNpcId() : "";
        msg.npcName = fragment.getNpcName() != null ? fragment.getNpcName() : "";
        msg.worldIndex = fragment.getWorldIndex();
        msg.title = fragment.getTitle() != null ? fragment.getTitle() : "";
        msg.excerpt = fragment.getExcerpt() != null ? fragment.getExcerpt() : "";
        msg.fateScore = fragment.getFateScore();
        msg.imageUrl = fragment.getImageUrl() != null ? fragment.getImageUrl() : "";
        msg.createTime = fragment.getCreateTime();
        msg.locked = fragment.isLocked();
        msg.unlockCondition = fragment.getUnlockCondition() != null ? fragment.getUnlockCondition() : "";
        return msg;
    }
}
