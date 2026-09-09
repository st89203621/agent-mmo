package com.iohao.mmo.person.service;

import com.iohao.mmo.hero.service.HeroService;
import com.iohao.mmo.person.entity.BasicProperty;
import com.iohao.mmo.person.entity.Person;
import com.iohao.mmo.person.proto.UpdatePersonMessage;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class PersonServiceTest {
    @Test
    public void negativeAndOverflowAllocationsCannotCreatePoints() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        PersonService service = new PersonService(mongo, mock(HeroService.class));
        Person person = new Person(); person.setId(9); person.setAttributePoints(10);
        person.setBasicProperty(new BasicProperty());
        when(mongo.findById(9L, Person.class)).thenReturn(person);
        assertThrows(RuntimeException.class, () -> service.allotPotential(9, -1, 0, 0, 0, 0, 0, 0));
        assertThrows(RuntimeException.class, () -> service.allotPotential(9, Integer.MAX_VALUE, Integer.MAX_VALUE, 0, 0, 0, 0, 0));
        assertEquals(10, person.getAttributePoints());
        verify(mongo, never()).save(any(Person.class));
    }

    @Test
    public void allocationConsumesPointsAndUpdatesCombatStats() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        PersonService service = new PersonService(mongo, mock(HeroService.class));
        Person person = new Person(); person.setId(9); person.setAttributePoints(10);
        person.setBasicProperty(service.createInitialProperty("ATTACK"));
        when(mongo.findById(9L, Person.class)).thenReturn(person);
        when(mongo.save(person)).thenReturn(person);
        service.allotPotential(9, 2, 0, 3, 0, 0, 0, 1);
        assertEquals(4, person.getAttributePoints());
        assertEquals(160, person.getBasicProperty().getHp());
        assertEquals(39, person.getBasicProperty().getPhysicsAttack());
        assertEquals(32, person.getBasicProperty().getBonusAttack());
        assertEquals(Integer.valueOf(3), person.getAllocatedPoints().get("physicsAttack"));
    }

    @Test
    public void completedCharacterCannotResetProfession() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        PersonService service = new PersonService(mongo, mock(HeroService.class));
        Person person = new Person(); person.setId(9); person.setName("旅人");
        person.setProfession("ATTACK"); person.setCustomizationComplete(true);
        when(mongo.findById(9L, Person.class)).thenReturn(person);
        UpdatePersonMessage request = new UpdatePersonMessage(); request.name = "旅人";
        request.gender = "female"; request.profession = "AGILITY"; request.appearanceJson = "{}";
        assertThrows(RuntimeException.class, () -> service.updateCustomization(9, request));
        verify(mongo, never()).save(any(Person.class));
    }

    @Test
    public void appearanceRejectsInvalidRangesAndStripsUnknownFields() {
        assertThrows(RuntimeException.class, () -> PersonService.validateAppearance("{\"Hair\":99}"));
        assertThrows(RuntimeException.class, () -> PersonService.validateAppearance("{\"EyeSize\":-1}"));
        String cleaned = PersonService.validateAppearance("{\"Hair\":2,\"Coins\":999999}");
        assertFalse(cleaned.contains("Coins"));
        assertTrue(cleaned.contains("\"Hair\":2"));
    }
}
