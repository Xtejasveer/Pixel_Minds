using System;
using System.Collections.Generic;

namespace CelestialSpire
{
    public static class GameState
    {
        public static string CurrentSector = "Maintenance Bay Gamma";
        public static string DroidUnit734Status = "Malfunctioning - Rogue";
        public public int DroidUnit734Health = 75; // Out of 100
        public static bool FusionCoreAccessPanelLocked = true;
        public static bool BayDoorLocked = true;
        public static string ChiefEngineerAnyaLocation = "Medical Bay"; // Evacuated here
        public static string AmbientSmell = "Ozone and burnt sugar";
    }

    public class Location
    {
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public static class StationLayout
    {
        public static Dictionary<string, string> SectorContents = new Dictionary<string, string>
        {
            {"Maintenance Bay Gamma", "Contains diagnostic equipment, tool racks, Fusion Core Access Panel."},
            {"ChiefEngineerOffice", "Contains Chief Engineer's Access Card."},
            {"Medical Bay", "Temporary location for Chief Engineer Anya Sharma."}
        };

        public static List<Location> KnownLocations = new List<Location>
        {
            new Location { Name = "Fusion Core Access Panel", Description = "Requires an 'Access Card' to open." },
            new Location { Name = "Workbench", Description = "Contains various tools and a spilled lubricant." }
        };
    }

    public class StationObject
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public string Location { get; set; }
        public bool IsBroken { get; set; }
        public bool IsMissing { get; set; }
    }

    public class StationCharacter
    {
        public string Name { get; set; }
        public string Role { get; set; }
        public string CurrentLocation { get; set; }
        public bool IsPresentInBay { get; set; }
    }

    public static class Objects
    {
        public static List<StationObject> BayObjects = new List<StationObject>
        {
            new StationObject { Name = "Diagnostic Equipment", Type = "Console", Location = "Maintenance Bay Gamma", IsBroken = false, IsMissing = false },
            new StationObject { Name = "Tool Racks", Type = "Storage", Location = "Maintenance Bay Gamma", IsBroken = false, IsMissing = false },
            new StationObject { Name = "Spilled Lubricant Canister", Type = "Evidence", Location = "Workbench", IsBroken = false, IsMissing = false },
            new StationObject { Name = "Fusion Core Access Panel", Type = "Mechanism", Location = "Maintenance Bay Gamma", IsBroken = false, IsMissing = false },
            new StationObject { Name = "Plasma Welder", Type = "Tool", Location = "Maintenance Bay Gamma", IsBroken = false, IsMissing = false },
            new StationObject { Name = "Access Card", Type = "Key Item", Location = "ChiefEngineerOffice", IsBroken = false, IsMissing = true } // Missing from current bay
        };
    }

    public static class Characters
    {
        public static List<StationCharacter> BayCharacters = new List<StationCharacter>
        {
            new StationCharacter { Name = "Droid Unit 734 (Sparky)", Role = "Maintenance Droid", CurrentLocation = "Unknown - Possibly in Bay", IsPresentInBay = true },
            new StationCharacter { Name = "Chief Engineer Anya Sharma", Role = "Engineer", CurrentLocation = "Medical Bay", IsPresentInBay = false }
        };
    }
}