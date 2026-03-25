package com.iohao.mmo.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * 全局异常处理 —— 消除 GameApiController 中 77 处 null 检查和 63 处 try-catch
 */
@Slf4j
@RestControllerAdvice(assignableTypes = GameApiController.class)
public class GameApiExceptionHandler {

    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<Map<String, Object>> handleNotLogin(NotLoginException e) {
        return ResponseEntity.ok(Map.of("code", -1, "msg", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(Exception e) {
        log.warn("API error: {}", e.getMessage(), e);
        String msg = e.getMessage();
        return ResponseEntity.ok(Map.of("code", -1, "msg", msg != null ? msg : "未知错误"));
    }
}
