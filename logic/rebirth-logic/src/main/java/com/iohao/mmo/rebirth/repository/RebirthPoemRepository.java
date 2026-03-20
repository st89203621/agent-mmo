package com.iohao.mmo.rebirth.repository;

import com.iohao.mmo.rebirth.entity.RebirthPoem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RebirthPoemRepository extends MongoRepository<RebirthPoem, String> {
    Optional<RebirthPoem> findByWorldIndexAndBookTitle(int worldIndex, String bookTitle);
}
