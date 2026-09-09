package com.iohao.mmo.bookworld.service;

import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.entity.PlayerBookSelection;
import com.iohao.mmo.bookworld.repository.BookWorldRepository;
import com.iohao.mmo.bookworld.repository.PlayerBookSelectionRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class BookWorldService {

    @Resource
    BookWorldRepository bookWorldRepository;

    @Resource
    PlayerBookSelectionRepository playerBookSelectionRepository;

    public List<BookWorld> listAllBooks() {
        return bookWorldRepository.findAll();
    }

    public Optional<BookWorld> getBookById(String bookId) {
        return bookWorldRepository.findById(bookId);
    }

    public PlayerBookSelection selectBook(long userId, int worldIndex, String bookId, String customArtStyle) {
        if (worldIndex < 1 || worldIndex > 7) {
            log.warn("用户 {} 选择了非法的世界索引 {}", userId, worldIndex);
            return null;
        }

        BookWorld book = bookWorldRepository.findById(bookId).orElse(null);
        if (Objects.isNull(book)) {
            log.warn("书籍不存在: {}", bookId);
            return null;
        }

        // 将当前激活的选择设为非激活（可能存在多个）
        playerBookSelectionRepository
                .findByUserIdAndWorldIndexAndActiveTrue(userId, worldIndex)
                .forEach(sel -> {
                    sel.setActive(false);
                    playerBookSelectionRepository.save(sel);
                });

        String selectionId = userId + "_" + worldIndex;
        PlayerBookSelection selection = new PlayerBookSelection();
        selection.setId(selectionId);
        selection.setUserId(userId);
        selection.setWorldIndex(worldIndex);
        selection.setBookId(bookId);
        selection.setSelectTime(System.currentTimeMillis());
        selection.setActive(true);
        selection.setCustomArtStyle(customArtStyle);

        return playerBookSelectionRepository.save(selection);
    }

    /** 更新用户的自定义图片风格 */
    public void updateCustomArtStyle(long userId, int worldIndex, String customArtStyle) {
        playerBookSelectionRepository.findByUserIdAndWorldIndexAndActiveTrue(userId, worldIndex)
                .stream().findFirst().ifPresent(sel -> {
                    sel.setCustomArtStyle(customArtStyle);
                    playerBookSelectionRepository.save(sel);
                });
    }

    public BookWorld uploadCustomBook(long userId, String title, String content, String author) {
        BookWorld book = new BookWorld();
        book.setId(UUID.randomUUID().toString());
        book.setTitle(title);
        book.setAuthor(author);
        book.setCategory(BookWorld.Category.CUSTOM);
        book.setLoreSummary(content.length() > 200 ? content.substring(0, 200) : content);
        book.setArtStyle("自定义风格");
        book.setColorPalette("#1a1a2e,#e0e0e0");
        book.setLanguageStyle("现代白话");
        book.setPreprocessed(false);
        book.setUploadedBy(userId);
        book.setCreateTime(System.currentTimeMillis());

        return bookWorldRepository.save(book);
    }

    public Optional<PlayerBookSelection> getSelectedBook(long userId, int worldIndex) {
        return playerBookSelectionRepository.findByUserIdAndWorldIndexAndActiveTrue(userId, worldIndex)
                .stream().findFirst();
    }
}
