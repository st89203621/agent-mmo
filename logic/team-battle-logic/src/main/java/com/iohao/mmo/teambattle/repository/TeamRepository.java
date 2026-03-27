package com.iohao.mmo.teambattle.repository;

import com.iohao.mmo.teambattle.entity.Team;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TeamRepository extends MongoRepository<Team, String> {
    List<Team> findByLeaderId(long leaderId);
    List<Team> findByStatus(String status);
}
