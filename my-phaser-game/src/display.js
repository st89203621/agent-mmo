/**
 * display.js  全局显示常量
 * 游戏画布使用物理像素渲染（高清），场景坐标保持逻辑尺寸
 */

// 设备像素比（取整，最大 3）
export const DPR = Math.min(Math.round(window.devicePixelRatio || 1), 3);

// 逻辑尺寸（场景坐标系）
export const GW = 390;
export const GH = 680;

// 物理像素尺寸（画布实际分辨率）
export const PW = GW * DPR;
export const PH = GH * DPR;
