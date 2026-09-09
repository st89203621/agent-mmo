package com.iohao.mmo.teambattle.repository;

import com.iohao.mmo.teambattle.entity.TeamBattleRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TeamBattleRecordRepository extends MongoRepository<TeamBattleRecord, String> {
}
