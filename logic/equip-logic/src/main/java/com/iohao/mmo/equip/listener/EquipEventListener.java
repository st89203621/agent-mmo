package com.iohao.mmo.equip.listener;

import com.iohao.mmo.equip.entity.EquipGarbage;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.BeforeDeleteEvent;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 监听删除事件
 * @author 唐斌
 * @date 2023-08-16
 * @description: 监听删除事件，重写删除装备为逻辑删除，
 * 在删除装备和装备库之前将数据迁移到回收类
 */
@Component
@AllArgsConstructor
public class EquipEventListener extends AbstractMongoEventListener<Object> {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Set<String> MONITORED_COLLECTIONS = Set.of("equip", "equipTemplate");

    private final MongoTemplate mongoTemplate;

    @Override
    public void onBeforeDelete(BeforeDeleteEvent<Object> event) {
        if (event.getType() == null
                || CollectionUtils.isEmpty(event.getDocument())
                || StringUtils.isBlank(event.getCollectionName())
                || !MONITORED_COLLECTIONS.contains(event.getCollectionName())) {
            return;
        }

        List<Object> objects = mongoTemplate.find(new BasicQuery(event.getDocument()), event.getType());
        if (!CollectionUtils.isEmpty(objects)) {
            String type = event.getCollectionName();
            String nowStr = LocalDateTime.now().format(DATE_TIME_FORMATTER);
            List<EquipGarbage> equipGarbageList = objects.stream()
                    .map(o -> {
                        EquipGarbage garbage = new EquipGarbage();
                        garbage.setType(type);
                        garbage.setData(o);
                        garbage.setCollectedTime(nowStr);
                        return garbage;
                    })
                    .collect(Collectors.toList());
            mongoTemplate.insertAll(equipGarbageList);
        }
    }
}
