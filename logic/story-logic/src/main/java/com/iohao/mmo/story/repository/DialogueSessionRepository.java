package com.iohao.mmo.story.repository;

import com.iohao.mmo.story.entity.DialogueSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface DialogueSessionRepository extends MongoRepository<DialogueSession, String> {
    Optional<DialogueSession> findByPlayerIdAndActiveTrue(long playerId);
}
