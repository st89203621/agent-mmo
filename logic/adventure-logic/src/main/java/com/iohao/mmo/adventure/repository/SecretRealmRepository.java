package com.iohao.mmo.adventure.repository;

import com.iohao.mmo.adventure.entity.SecretRealm;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecretRealmRepository extends MongoRepository<SecretRealm, String> {
    List<SecretRealm> findByUserId(long userId);
    SecretRealm findByUserIdAndRealmId(long userId, String realmId);
}

