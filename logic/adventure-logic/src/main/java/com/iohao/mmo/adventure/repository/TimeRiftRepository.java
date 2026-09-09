package com.iohao.mmo.adventure.repository;

import com.iohao.mmo.adventure.entity.TimeRift;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimeRiftRepository extends MongoRepository<TimeRift, String> {
    List<TimeRift> findByUserId(long userId);
    List<TimeRift> findByStatus(TimeRift.RiftStatus status);
}

