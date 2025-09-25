using System;
using System.Collections.Generic;

namespace PharaohsTomb
{
    public static class GameState
    {
        public static string CurrentLocation = "Tomb Entrance - Excavation Area";
        public static string TombStatus = "Sealed - Rockfall";
        public public int AirQuality = 80; // Out of 100, due to dust
        public static bool MainEntranceBlocked = true;
        public static bool HiddenChamberAccessible = false;
        public static string DrArisThorneLocation = "Initial Antechamber - Trapped";
        public static string AmbientSmell = "Ancient dust, jasmine and cedar";
    }

    public class Location
    {
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public static class TombLayout
    {
        public static Dictionary<string, string> ChamberContents = new Dictionary<string, string>
        {
            {"Tomb Entrance - Excavation Area", "Contains scattered archaeological tools and debris."},
            {"Initial Antechamber", "Contains 'Chamber of Whispers Hieroglyphs', 'Ancient Water Clock'."},
            {"Hidden Chamber", "Status unknown, believed untouched."}
        };

        public static List<Location> KnownLocations = new List<Location>
        {
            new Location { Name = "Loose Sandstone Block", Description = "Near the entrance, possibly a trigger for the rockfall." },
            new Location { Name = "Main Console", Description = "Requires power to access 'Tomb Integrity Report'." }
        };
    }

    public class TombObject
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public string Location { get; set; }
        public bool IsBroken { get; set; }
        public bool IsMissing { get; set; }
    }

    public class TombCharacter
    {
        public string Name { get; set; }
        public string Role { get; set; }
        public string CurrentLocation { get; set; }
        public bool IsPresentHere { get; set; }
    }

    public static class Objects
    {
        public static List<TombObject> ExcavationObjects = new List<TombObject>
        {
            new TombObject { Name = "Dig Site Communications Array", Type = "Equipment", Location = "Excavation Area", IsBroken = false, IsMissing = false },
            new TombObject { Name = "Archaeological Tools", Type = "Tools", Location = "Excavation Area", IsBroken = false, IsMissing = false },
            new TombObject { Name = "Geological Scanner", Type = "Tool", Location = "Excavation Area", IsBroken = false, IsMissing = false },
            new TombObject { Name = "Chamber of Whispers Hieroglyphs", Type = "Text", Location = "Initial Antechamber", IsBroken = false, IsMissing = false },
            new TombObject { Name = "Ancient Water Clock", Type = "Mechanism", Location = "Initial Antechamber", IsBroken = false, IsMissing = false },
            new TombObject { Name = "Sacred Scarab Medallion", Type = "Key Item", Location = "Unknown", IsBroken = false, IsMissing = true }
        };
    }

    public static class Characters
    {
        public static List<TombCharacter> ExpeditionCharacters = new List<TombCharacter>
        {
            new TombCharacter { Name = "Professor Evelyn Reed", Role = "Team Leader", CurrentLocation = "Excavation Area", IsPresentHere = true },
            new TombCharacter { Name = "Dr. Aris Thorne", Role = "Lead Cryptographer", CurrentLocation = "Initial Antechamber", IsPresentHere = false }
        };
    }
}