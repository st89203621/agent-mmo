/*
 * ioGame
 * Copyright (C) 2021 - present  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
 * # iohao.com . 渔民小镇
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.iohao.mmo.pet.util;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Enumeration;

/**
 * 网络工具类 - 用于获取本机IP地址
 *
 * @author 渔民小镇
 * @date 2024-10-14
 */
@Slf4j
@UtilityClass
public class NetworkUtils {

    /**
     * 获取本机局域网IP地址（智能选择最合适的IP）
     * 优先级：192.168.x.x > 10.x.x.x > 172.16-31.x.x > 其他私有IP
     *
     * @return 本机IP地址，如果获取失败返回 "localhost"
     */
    public String getLocalIpAddress() {
        try {
            InetAddress ip192 = null;  // 192.168.x.x
            InetAddress ip10 = null;   // 10.x.x.x
            InetAddress ip172 = null;  // 172.16-31.x.x
            InetAddress ipOther = null; // 其他私有IP

            // 遍历所有网络接口
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface networkInterface = networkInterfaces.nextElement();

                // 跳过未启用或回环接口
                if (!networkInterface.isUp() || networkInterface.isLoopback()) {
                    continue;
                }

                Enumeration<InetAddress> inetAddresses = networkInterface.getInetAddresses();
                while (inetAddresses.hasMoreElements()) {
                    InetAddress inetAddress = inetAddresses.nextElement();

                    // 只处理IPv4地址，跳过回环地址
                    if (inetAddress.isLoopbackAddress() || !inetAddress.isSiteLocalAddress()) {
                        continue;
                    }

                    String ip = inetAddress.getHostAddress();

                    // 按优先级分类IP地址
                    if (ip.startsWith("192.168.")) {
                        ip192 = inetAddress;
                    } else if (ip.startsWith("10.")) {
                        if (ip10 == null) {
                            ip10 = inetAddress;
                        }
                    } else if (ip.startsWith("172.")) {
                        // 检查是否是172.16-31.x.x段
                        String[] parts = ip.split("\\.");
                        if (parts.length == 4) {
                            int second = Integer.parseInt(parts[1]);
                            if (second >= 16 && second <= 31) {
                                if (ip172 == null) {
                                    ip172 = inetAddress;
                                }
                            }
                        }
                    } else if (ipOther == null) {
                        ipOther = inetAddress;
                    }
                }
            }

            // 按优先级返回IP
            InetAddress selectedAddress = ip192 != null ? ip192 :
                                         ip10 != null ? ip10 :
                                         ip172 != null ? ip172 :
                                         ipOther;

            if (selectedAddress != null) {
                String ip = selectedAddress.getHostAddress();
                log.info("✅ 检测到本机IP地址: {}", ip);
                return ip;
            }

            // 如果以上都失败，尝试使用InetAddress.getLocalHost()
            InetAddress localHost = InetAddress.getLocalHost();
            String ip = localHost.getHostAddress();
            if (!ip.equals("127.0.0.1")) {
                log.info("✅ 通过LocalHost获取IP地址: {}", ip);
                return ip;
            }

        } catch (SocketException e) {
            log.warn("⚠️ 获取网络接口失败: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("⚠️ 获取本机IP地址失败: {}", e.getMessage());
        }

        // 如果所有方法都失败，返回localhost
        log.warn("⚠️ 无法获取本机IP地址，使用默认值: localhost");
        return "localhost";
    }

    /**
     * 构建前端服务器URL
     * 
     * @param port 端口号
     * @return 完整的URL，例如: http://192.168.0.105:8080
     */
    public String buildFrontendServerUrl(int port) {
        String ip = getLocalIpAddress();
        String url = String.format("http://%s:%d", ip, port);
        log.info("🌐 前端服务器URL: {}", url);
        return url;
    }
}

