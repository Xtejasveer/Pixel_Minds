// supermarket_environment.cs

using System;
using System.Collections.Generic;

namespace GrocersParadise
{
    public static class GameState
    {
        public static bool IsStoreOpen = true;
        public static string CurrentTime = "08:30 AM";
        public static int CustomerCount = 15;
        public static string Weather = "Sunny";
        public static string SpecialEvent = "None"; // Could be "Holiday Sale", "Stock Take", etc.
    }

    public static class StoreLayout
    {
        public static Dictionary<string, (float x, float y, float z)> Locations = new Dictionary<string, (float x, float y, float z)>
        {
            {"Entrance", (0.0f, 0.0f, 10.0f)},
            {"Checkout 1", (5.0f, 0.0f, 8.0f)},
            {"Produce Section", (-10.0f, 0.0f, 0.0f)},
            {"Dairy Aisle", (-5.0f, 0.0f, -5.0f)},
            {"Bakery", (10.0f, 0.0f, 5.0f)},
            {"Meat Counter", (15.0f, 0.0f, -2.0f)},
            {"Frozen Foods", (0.0f, 0.0f, -10.0f)},
            {"Cleaning Supplies", (-15.0f, 0.0f, -10.0f)},
            {"Back Stockroom", (20.0f, 0.0f, -10.0f)},
            {"Manager's Office", (25.0f, 3.0f, -5.0f)} // Example of different Y-axis for office
        };

        public static Dictionary<string, string> AisleContents = new Dictionary<string, string>
        {
            {"Produce Section", "Fresh fruits (apples, bananas, grapes), vegetables (carrots, lettuce, tomatoes). Currently, organic oranges are missing."},
            {"Dairy Aisle", "Milk, cheese, yogurt, butter, eggs. Temperature set to 4°C."},
            {"Bakery", "Freshly baked bread, pastries, cakes, cookies. Oven recently used, warm air detected."},
            {"Meat Counter", "Beef, chicken, pork, fish. Refrigerated display, some blood stains on the floor."},
            {"Frozen Foods", "Ice cream, frozen meals, vegetables. Very cold, some frost on packaging."},
            {"Cleaning Supplies", "Detergents, mops, brooms, disinfectants. Strong chemical smell."},
        };
    }

    public class StoreObject
    {
        public string Name { get; set; }
        public string Type { get; set; } // "Shelf", "Display", "Cart", "Door", "Portal"
        public string Location { get; set; } // e.g., "Produce Section"
        public bool IsInteractive { get; set; }
        public bool IsOpen { get; set; } = false;
        public string State { get; set; } // "Full", "Empty", "Damaged", "Working", "Shimmering"
        public List<string> Contents { get; set; } = new List<string>();

        public override string ToString() => $"{Type}: {Name} in {Location} (State: {State})";
    }

    public class NPC
    {
        public string Name { get; set; }
        public string Role { get; set; }
        public string Location { get; set; }
        public string Status { get; set; } // "Working", "On Break", "Missing", "Talking"

        public override string ToString() => $"NPC: {Name} ({Role}) in {Location} (Status: {Status})";
    }

    public static class EnvironmentData
    {
        public static List<StoreObject> Objects = new List<StoreObject>
        {
            new StoreObject { Name = "Orange Bin", Type = "Display", Location = "Produce Section", IsInteractive = true, State = "Empty", Contents = new List<string>() },
            new StoreObject { Name = "Apple Shelf", Type = "Shelf", Location = "Produce Section", IsInteractive = false, State = "Full", Contents = new List<string> {"Red Apples", "Green Apples"} },
            new StoreObject { Name = "Front Door", Type = "Door", Location = "Entrance", IsInteractive = true, IsOpen = true, State = "Automatic" },
            new StoreObject { Name = "Stockroom Door", Type = "Door", Location = "Back Stockroom", IsInteractive = true, IsOpen = true, State = "Ajar" },
            new StoreObject { Name = "Checkout Counter 1", Type = "Counter", Location = "Checkout 1", IsInteractive = true, State = "Active" },
            new StoreObject { Name = "Portal (Glimmer)", Type = "Portal", Location = "Back Stockroom", IsInteractive = true, State = "Shimmering, emitting blue light", Contents = new List<string> {"Strange golden wrappers", "Melted Caramel puddle"} },
            new StoreObject { Name = "Lost Cart", Type = "Cart", Location = "Frozen Foods", IsInteractive = false, State = "Empty" }
        };

        public static List<NPC> Characters = new List<NPC>
        {
            new NPC { Name = "Mr. Henderson", Role = "Produce Manager", Location = "Unknown", Status = "Missing" },
            new NPC { Name = "Ms. Jenkins", Role = "Cashier", Location = "Checkout 1", Status = "Working, scanning items" },
            new NPC { Name = "Young Shopper", Role = "Customer", Location = "Dairy Aisle", Status = "Looking confused" }
        };

        public static string GetCurrentEnvironmentDescription()
        {
            string description = $"Current Game State:\n";
            description += $"  Store Open: {GameState.IsStoreOpen}\n";
            description += $"  Time: {GameState.CurrentTime}\n";
            description += $"  Customers: {GameState.CustomerCount}\n";
            description += $"  Weather: {GameState.Weather}\n";
            description += $"  Special Event: {GameState.SpecialEvent}\n\n";

            description += "Store Objects:\n";
            foreach (var obj in Objects)
            {
                description += $"  - {obj}\n";
            }
            description += "\n";

            description += "Characters:\n";
            foreach (var character in Characters)
            {
                description += $"  - {character}\n";
            }
            description += "\n";

            description += "Aisle Contents:\n";
            foreach (var entry in StoreLayout.AisleContents)
            {
                description += $"  - {entry.Key}: {entry.Value}\n";
            }

            return description;
        }
    }

    // Example of how you might use this data in a game
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine("--- Grocer's Paradise Environment Data ---");
            Console.WriteLine(EnvironmentData.GetCurrentEnvironmentDescription());

            // Example of a code analysis task: Find the status of the Orange Bin
            var orangeBin = EnvironmentData.Objects.Find(o => o.Name == "Orange Bin");
            if (orangeBin != null)
            {
                Console.WriteLine($"\nOrange Bin Status: {orangeBin.State}");
            }
            else
            {
                Console.WriteLine("\nOrange Bin not found.");
            }
        }
    }
}