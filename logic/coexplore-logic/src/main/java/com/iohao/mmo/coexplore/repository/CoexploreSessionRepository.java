package com.iohao.mmo.coexplore.repository;

import com.iohao.mmo.coexplore.entity.CoexploreSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CoexploreSessionRepository extends MongoRepository<CoexploreSession, String> {
    List<CoexploreSession> findByStatus(String status);

    CoexploreSession findByHostIdAndStatusNot(long hostId, String status);

    CoexploreSession findByGuestIdAndStatusNot(long guestId, String status);
}
