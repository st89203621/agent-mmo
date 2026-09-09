package com.iohao.mmo.api.dev;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 工作台素材本地存储。
 * 文件名采用 UUID 防冲突，按 yyyyMMdd 分桶便于清理。
 * 对外暴露的 URL 走 {@code /assets/dev-workbench/**} 静态映射。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DevAssetStorage {

    public static final String URL_PREFIX = "/assets/dev-workbench/";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String UPLOAD_BUCKET = "uploads";
    private static final String OUTPUT_BUCKET = "outputs";

    private final DevWorkbenchProperties props;
    private Path root;

    @PostConstruct
    void init() throws IOException {
        root = Paths.get(props.getAssetsPath()).toAbsolutePath().normalize();
        Files.createDirectories(root.resolve(UPLOAD_BUCKET));
        Files.createDirectories(root.resolve(OUTPUT_BUCKET));
        log.info("DevAssetStorage 根目录: {}", root);
    }

    public Path root() {
        return root;
    }

    public StoredAsset saveUpload(byte[] bytes, String ext) throws IOException {
        return save(UPLOAD_BUCKET, bytes, ext);
    }

    public StoredAsset saveOutput(byte[] bytes, String ext) throws IOException {
        return save(OUTPUT_BUCKET, bytes, ext);
    }

    public boolean delete(String url) throws IOException {
        Path p = resolveByUrl(url);
        if (p == null || !Files.exists(p)) return false;
        Files.delete(p);
        return true;
    }

    private StoredAsset save(String bucket, byte[] bytes, String ext) throws IOException {
        String safeExt = (ext == null || ext.isBlank()) ? ".png" : (ext.startsWith(".") ? ext : "." + ext);
        Path dir = root.resolve(bucket).resolve(LocalDate.now().format(DATE_FMT));
        Files.createDirectories(dir);
        String name = UUID.randomUUID().toString().replace("-", "") + safeExt;
        Path target = dir.resolve(name);
        Files.write(target, bytes);
        return new StoredAsset(toUrl(target), name, bytes.length, System.currentTimeMillis());
    }

    private String toUrl(Path file) {
        String rel = root.relativize(file).toString().replace('\\', '/');
        return URL_PREFIX + rel;
    }

    private Path resolveByUrl(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) return null;
        Path p = root.resolve(url.substring(URL_PREFIX.length())).normalize();
        return p.startsWith(root) ? p : null;
    }

    public record StoredAsset(String url, String name, long size, long createdAt) {}
}
