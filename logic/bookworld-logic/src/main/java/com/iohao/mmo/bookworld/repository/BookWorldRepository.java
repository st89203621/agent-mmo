package com.iohao.mmo.bookworld.repository;

import com.iohao.mmo.bookworld.entity.BookWorld;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BookWorldRepository extends MongoRepository<BookWorld, String> {
    List<BookWorld> findByUploadedBy(long uploadedBy);
    List<BookWorld> findByCategory(BookWorld.Category category);
    List<BookWorld> findByTitle(String title);
}
