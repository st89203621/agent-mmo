package com.iohao.mmo.bookworld.explore;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("explore_state")
public class ExploreState {
    @Id
    private String id;
    @Indexed(unique = true)
    private long userId;
    private int actionPoints = 10;
    private Instant lastRecoverTime = Instant.now();
    private int todayExploreCount;
    private String lastExploreDate;
}
