package com.iohao.mmo.adventure.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.adventure.cmd.AdventureCmd;
import com.iohao.mmo.adventure.proto.*;
import com.iohao.mmo.adventure.service.NativeAdventureService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ActionController(AdventureCmd.cmd)
public class NativeAdventureAction {
    private final NativeAdventureService service;
    @ActionMethod(AdventureCmd.nativeEnter)
    public NativeWorldSnapshot nativeEnter(NativeWorldRequest request, FlowContext context) { return service.enter(context.getUserId(), request); }
    @ActionMethod(AdventureCmd.nativeMove)
    public NativeWorldSnapshot nativeMove(NativeMoveRequest request, FlowContext context) { return service.move(context.getUserId(), request); }
    @ActionMethod(AdventureCmd.nativeSnapshot)
    public NativeWorldSnapshot nativeSnapshot(FlowContext context) { return service.snapshot(context.getUserId()); }
    @ActionMethod(AdventureCmd.nativeAction)
    public NativeWorldSnapshot nativeAction(NativeCombatRequest request, FlowContext context) { return service.action(context.getUserId(), request); }
    @ActionMethod(AdventureCmd.nativeInteract)
    public NativeWorldSnapshot nativeInteract(NativeInteractRequest request, FlowContext context) { return service.interact(context.getUserId(), request); }
    @ActionMethod(AdventureCmd.nativeRevive)
    public NativeWorldSnapshot nativeRevive(FlowContext context) { return service.revive(context.getUserId()); }
    @ActionMethod(AdventureCmd.nativeLeave)
    public NativeWorldSnapshot nativeLeave(FlowContext context) { return service.leave(context.getUserId()); }
}
