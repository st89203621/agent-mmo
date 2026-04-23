package com.iohao.mmo.common.ai.chat;

import java.util.function.Consumer;

public interface AiChatProvider {

    String complete(AiChatRequest request);

    void stream(AiChatRequest request,
                Consumer<String> onToken,
                Consumer<String> onComplete,
                Consumer<Throwable> onError);

    String providerName();
}
