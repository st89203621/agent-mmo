package com.iohao.mmo;

import com.iohao.game.action.skeleton.core.ActionCommand;
import com.iohao.game.action.skeleton.core.ActionFactoryBean;
import com.iohao.game.action.skeleton.core.DependencyInjectionPart;
import com.iohao.game.action.skeleton.core.doc.BroadcastDocument;
import com.iohao.game.action.skeleton.core.doc.CsharpDocumentGenerate;
import com.iohao.game.action.skeleton.core.doc.IoGameDocumentHelper;
import com.iohao.game.bolt.broker.client.BrokerClientStartup;
import com.iohao.game.widget.light.protobuf.kit.GenerateFileKit;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.common.provide.cmd.CommonCmd;
import com.iohao.mmo.common.provide.proto.ShowItemMessage;
import org.springframework.stereotype.Component;

import static com.iohao.mmo.OneApplication.listLogic;

/**
 * @author 渔民小镇
 * @date 2024-11-16
 */
public class TestGenerate {
    public static void main(String[] args) {
        extractedTrick();

        // 加载各逻辑服的业务框架
        listLogic().forEach(BrokerClientStartup::createBarSkeleton);

        extractedDoc();

        var documentGenerate = new CsharpDocumentGenerate();
        IoGameDocumentHelper.addDocumentGenerate(documentGenerate);

        // ====== 生成对接文档、生成 proto ======

        // 添加枚举错误码 class，用于生成错误码相关信息
        IoGameDocumentHelper.addErrorCodeClass(GameCode.class);
        // 生成文档
        IoGameDocumentHelper.generateDocument();

        // .proto 文件生成
        generateProtoFile();
    }

    private static void extractedDoc() {
        IoGameDocumentHelper.addBroadcastDocument(BroadcastDocument.newBuilder(CommonCmd.of(CommonCmd.broadcastShowItem))
                .setDataClassList(ShowItemMessage.class)
                .setMethodName("showItem")
                .setMethodDescription("获得新物品通知")
        );
    }

    private static void generateProtoFile() {
        // 需要扫描的包名
        String packagePath = "com.iohao.mmo";
        // .proto 文件生成
        GenerateFileKit.generate(packagePath);
    }

    private static void extractedTrick() {
        // 绕过 spring 构造注入
        DependencyInjectionPart dependencyInjectionPart = DependencyInjectionPart.me();
        dependencyInjectionPart.setInjection(true);
        dependencyInjectionPart.setAnnotationClass(Component.class);
        dependencyInjectionPart.setActionFactoryBean(new ActionFactoryBean<>() {
            @Override
            public Object getBean(ActionCommand actionCommand) {
                return new Object();
            }

            @Override
            public Object getBean(Class<?> actionControllerClazz) {
                return new Object();
            }
        });
    }
}