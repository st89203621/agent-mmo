package com.iohao.mmo.memory.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MemoryHall {
    @Id
    long id;

    List<String> fragmentIds;
    int totalFragments;
    int unlockedFragments;

    public void addFragment(String fragmentId) {
        if (fragmentIds == null) {
            fragmentIds = new ArrayList<>();
        }
        if (!fragmentIds.contains(fragmentId)) {
            fragmentIds.add(fragmentId);
            totalFragments++;
        }
    }
}
