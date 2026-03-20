package com.iohao.mmo.event.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 活动响应DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private boolean success;
    private String message;
    private Object data;
    
    public static EventResponse success(Object data) {
        return EventResponse.builder()
            .success(true)
            .message("成功")
            .data(data)
            .build();
    }
    
    public static EventResponse error(String message) {
        return EventResponse.builder()
            .success(false)
            .message(message)
            .data(null)
            .build();
    }
}

