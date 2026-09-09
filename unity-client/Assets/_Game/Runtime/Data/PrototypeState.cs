using System;
using UnityEngine;

namespace Lunhui
{
    [Serializable]
    public sealed class PrototypeState
    {
        public int Version = 1;
        public string Nickname = "";
        public int Career;
        public int Server;
        public int Level = 1;
        public int Coins = 12000;
        public int Ore = 80;
        public int Essence = 30;
        public int EquipmentQuality = 1;
        public int EnchantLevel;
        public int ActivePet;
        public int PetLevel = 1;
        public bool IntroComplete;
        public bool GuildJoined;
        public int Contribution;
        public bool UseMaleModel;
        public int Experience;
        public int[] RealmKills = new int[7];
        public int MemoryMask;
        public int BossMask;
        public int TreasureMask;
        public int[] SubmapKills = new int[21];
        public int[] SubmapMemories = new int[21];
        public int SubmapBossMask;
        public int SubmapTreasureMask;
        public CharacterAppearance Appearance = new CharacterAppearance();

        public static PrototypeState Create(bool demo)
        {
            return demo ? new PrototypeState { Nickname = "旅人", Level = 65, Coins = 286000, Ore = 480, Essence = 160, EquipmentQuality = 4, EnchantLevel = 2, PetLevel = 8, IntroComplete = true } : new PrototypeState();
        }

        public void Sanitize()
        {
            Career = Mathf.Clamp(Career, 0, 2);
            Server = Mathf.Clamp(Server, 0, 1);
            Level = Mathf.Clamp(Level, 1, 120);
            Coins = Mathf.Clamp(Coins, 0, 100000000);
            Ore = Mathf.Clamp(Ore, 0, 1000000);
            Essence = Mathf.Clamp(Essence, 0, 1000000);
            EquipmentQuality = Mathf.Clamp(EquipmentQuality, 1, 30);
            EnchantLevel = Mathf.Clamp(EnchantLevel, 0, 10);
            ActivePet = Mathf.Clamp(ActivePet, 0, 1);
            PetLevel = Mathf.Clamp(PetLevel, 1, 30);
            Contribution = Mathf.Clamp(Contribution, 0, 1000000);
            Experience = Mathf.Clamp(Experience, 0, 10000000);
            if (RealmKills == null || RealmKills.Length != 7) RealmKills = new int[7];
            for (int i = 0; i < RealmKills.Length; i++) RealmKills[i] = Mathf.Clamp(RealmKills[i], 0, 1000000);
            MemoryMask &= 0x1fffff;
            BossMask &= 127;
            TreasureMask &= 127;
            if (SubmapKills == null || SubmapKills.Length != 21) SubmapKills = new int[21];
            if (SubmapMemories == null || SubmapMemories.Length != 21) SubmapMemories = new int[21];
            for (int i = 0; i < 21; i++) { SubmapKills[i] = Mathf.Clamp(SubmapKills[i], 0, 1000000); SubmapMemories[i] &= 7; }
            if(Appearance==null)Appearance=new CharacterAppearance();
            Appearance.Sanitize();
            Nickname = Nickname ?? "";
        }
    }
}


