package com.iohao.mmo.bookworld.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.bookworld.cmd.BookWorldCmd;
import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.entity.PlayerBookSelection;
import com.iohao.mmo.bookworld.proto.BookWorldMessage;
import com.iohao.mmo.bookworld.proto.SelectBookRequest;
import com.iohao.mmo.bookworld.proto.UploadBookRequest;
import com.iohao.mmo.bookworld.service.BookWorldService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Component
@ActionController(BookWorldCmd.cmd)
public class BookWorldAction {

    @Resource
    BookWorldService bookWorldService;

    @ActionMethod(BookWorldCmd.listBooks)
    public List<BookWorldMessage> listBooks() {
        List<BookWorld> books = bookWorldService.listAllBooks();
        return books.stream().map(this::toMessage).toList();
    }

    @ActionMethod(BookWorldCmd.getBookDetail)
    public BookWorldMessage getBookDetail(String bookId) {
        Optional<BookWorld> bookOpt = bookWorldService.getBookById(bookId);
        return bookOpt.map(this::toMessage).orElse(null);
    }

    @ActionMethod(BookWorldCmd.selectBook)
    public BookWorldMessage selectBook(SelectBookRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PlayerBookSelection selection = bookWorldService.selectBook(userId, request.worldIndex, request.bookId);
        if (Objects.isNull(selection)) {
            return null;
        }
        Optional<BookWorld> bookOpt = bookWorldService.getBookById(selection.getBookId());
        return bookOpt.map(this::toMessage).orElse(null);
    }

    @ActionMethod(BookWorldCmd.uploadCustomBook)
    public BookWorldMessage uploadCustomBook(UploadBookRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        BookWorld book = bookWorldService.uploadCustomBook(userId, request.title, request.content, request.author);
        return toMessage(book);
    }

    @ActionMethod(BookWorldCmd.getSelectedBook)
    public BookWorldMessage getSelectedBook(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        // 默认查询当前世界（worldIndex=1），客户端可先查轮回系统获取当前worldIndex再调用selectBook
        Optional<PlayerBookSelection> selOpt = bookWorldService.getSelectedBook(userId, 1);
        if (selOpt.isEmpty()) {
            return null;
        }
        Optional<BookWorld> bookOpt = bookWorldService.getBookById(selOpt.get().getBookId());
        return bookOpt.map(this::toMessage).orElse(null);
    }

    private BookWorldMessage toMessage(BookWorld book) {
        BookWorldMessage msg = new BookWorldMessage();
        msg.bookId = book.getId();
        msg.title = book.getTitle();
        msg.author = book.getAuthor();
        msg.category = book.getCategory() != null ? book.getCategory().name() : "";
        msg.loreSummary = book.getLoreSummary();
        msg.artStyle = book.getArtStyle();
        msg.colorPalette = book.getColorPalette();
        msg.languageStyle = book.getLanguageStyle();
        msg.coverUrl = book.getCoverUrl() != null ? book.getCoverUrl() : "";
        msg.isPreprocessed = book.isPreprocessed();
        return msg;
    }
}
