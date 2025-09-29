using System.Collections.Generic;

public static class GameState
{
    public static string StoreName = "GrocersParadise";
    public static bool IsOpen = true;
    public static int CustomersInStore = 1;
    public static string AlertStatus = "None";
}

public static class StoreLayout
{
    // These names match the 'worldData.locations' in main.js
    public static class Locations
    {
        public static string Entrance = "entrance";
        public static string Produce = "produce section";
        public static string Dairy = "dairy section";
        public static string Checkout = "checkout counter";
        public static string Aisle1 = "aisle 1";
        public static string Aisle2 = "aisle 2";
        public static string Aisle3 = "aisle 3";

        
    }

    public static Dictionary<string, string> AisleContents = new Dictionary<string, string>
    {
        {"aisle 1", "Canned goods, pasta, and sauces."},
        {"aisle 2", "Snacks, cereals, and drinks."},
        {"aisle 3", "Health, pharmacy, and personal care items."}
    };
}

public static class WorldObjects
{
    // A list of interactable objects in the scene
    public static List<StoreObject> Objects = new List<StoreObject>
    {
        new StoreObject { Name = "front door", IsInteractable = true, Status = "Closed" },
        new StoreObject { Name = "cash register", IsInteractable = true, Status = "Idle" },
        new StoreObject { Name = "golden wrapper", IsInteractable = false, Status = "On floor near aisle 1" }
    };

    // A list of characters
    public static List<Character> Characters = new List<Character>
    {
        new Character { Name = "Leo", Role = "Store Manager Android" }
    };
}

// Data structures for the lists
public class StoreObject
{
    public string Name { get; set; }
    public bool IsInteractable { get; set; }
    public string Status { get; set; }
}

public class Character
{
    public string Name { get; set; }
    public string Role { get; set; }
}