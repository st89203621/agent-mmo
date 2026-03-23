package com.iohao.mmo.bookworld.repository;

import com.iohao.mmo.bookworld.entity.BookChunk;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BookChunkRepository extends MongoRepository<BookChunk, String> {

    List<BookChunk> findByBookIdOrderBySeqIndex(String bookId);

    long countByBookId(String bookId);

    void deleteByBookId(String bookId);
}
