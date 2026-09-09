package com.iohao.mmo.api;

/**
 * 未登录异常 —— 由 requireLogin 抛出，由 GameApiExceptionHandler 统一捕获
 */
public class NotLoginException extends RuntimeException {
    public NotLoginException() {
        super("未登录");
    }
}
