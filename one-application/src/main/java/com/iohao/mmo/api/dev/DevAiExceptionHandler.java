package com.iohao.mmo.api.dev;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * 工作台 REST 全局异常 → 统一 {code, msg} 协议。
 */
@Slf4j
@RestControllerAdvice(assignableTypes = DevAiController.class)
public class DevAiExceptionHandler {

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(SecurityException e) {
        return ResponseEntity.ok(Map.of("code", 403, "msg", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAny(Exception e) {
        log.warn("DevAi API error: {}", e.getMessage(), e);
        String msg = e.getMessage();
        return ResponseEntity.ok(Map.of("code", -1, "msg", msg != null ? msg : "未知错误"));
    }
}
