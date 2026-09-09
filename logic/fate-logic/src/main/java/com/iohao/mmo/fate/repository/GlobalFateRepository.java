package com.iohao.mmo.fate.repository;

import com.iohao.mmo.fate.entity.GlobalFate;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GlobalFateRepository extends MongoRepository<GlobalFate, Long> {
}
