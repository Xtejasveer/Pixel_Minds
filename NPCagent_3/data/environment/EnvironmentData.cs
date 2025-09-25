// This C# script contains raw, simulated data for a game environment.
// It can be used to test data retrieval and parsing functions in a multi-agent system.
using UnityEngine;

public class EnvironmentData : MonoBehaviour
{
    [Header("Weather Conditions")]
    public float temperature = 22.5f;
    public float windSpeed = 5.8f;
    public int cloudCover = 75; // Percentage
    public float humidity = 80.0f; // Percentage
    public float rainIntensity = 0.8f; // 0.0 to 1.0
    public float snowFallRate = 0.0f; // 0.0 to 1.0
    public int uvIndex = 2;

    [Header("Player and NPC States")]
    public int npcHealth = 95;
    public int npcStamina = 75;
    public bool isDayTime = true;
    public string currentBiome = "Forest";

    [Header("Game World Objects")]
    public int treeHealth = 100;
    public int rockDurability = 50;
    public bool isRiverFrozen = false;
    
    // Additional data that could be added and parsed
    // public float waterLevel = 0.5f;
    // public string animalActivity = "Low";
}
