# Voting Data Persistence Feature

## Overview
This feature automatically saves voting results to a JSON file whenever you switch between panels/events in the MUN Timer application.

## What Was Added

### 1. Data Storage Structure
- Added `votingResults` object to `appData` to store voting data for each event
- Each voting event is identified by its unique event ID
- Voting data includes:
  - Vote mode (simple, two-thirds, security council, consensus)
  - Vote type (substantive, procedural)
  - Vote counts (for/against/abstain) OR Security Council per-member votes
  - Timestamp of when data was saved

### 2. Auto-Save Functionality
**When:** Automatically triggered when you switch away from a voting event to another event

**What's Saved:**
- Current majority mode and vote type settings
- For numeric voting: For, Against, and Abstain vote counts
- For Security Council voting: Individual vote choices for each member
- All data is stored in `appData.votingResults` object keyed by event ID

**Smart Saving:** 
- File is only downloaded if voting data has actually changed
- Prevents unnecessary file downloads when just browsing events
- Ignores changes if all votes are still at default values (zeros or default selections)

**File Output:** Creates/downloads `mun-timer-autosave.json` file to your Downloads folder

### 3. Auto-Load Functionality
**When:** Automatically triggered when you switch to a voting event

**What's Loaded:**
- Restores the majority mode and vote type from last session
- Restores vote counts or Security Council member votes
- Recalculates and displays the voting visualization
- Shows the result (PASSED/FAILED/TIE)

## How It Works

### User Experience
1. Navigate to a voting event
2. Select your voting mode (Simple Majority, Two Thirds, etc.)
3. Enter vote counts or make Security Council selections
4. Switch to a different event → **Auto-save happens!**
5. A JSON file `mun-timer-autosave.json` is downloaded
6. Switch back to the voting event → **Data is restored automatically!**

### Technical Details

#### New Functions Added:
- `saveVotingData()` - Captures current voting state and stores it (only if changed)
- `hasVotingDataChanged()` - Compares current voting data with previously saved data
- `loadVotingData()` - Restores voting state when returning to a voting event
- `autoSaveToFile()` - Downloads the complete appData as JSON file

#### Modified Functions:
- `setCurrentEvent()` - Now calls `saveVotingData()` before switching events
- `ensureDefaults()` - Initializes `votingResults` object if not present
- Voting event rendering - Now calls `loadVotingData()` after rendering

## File Format
The auto-saved JSON file contains the complete application state including:
```json
{
  "topics": [...],
  "events": [...],
  "delegates": [...],
  "chair": {...},
  "votingConfig": {...},
  "speechesDefaults": {...},
  "votingResults": {
    "4": {
      "mode": "simple",
      "voteType": "substantive",
      "forVotes": 8,
      "againstVotes": 2,
      "abstainVotes": 0,
      "timestamp": "2025-10-07T12:34:56.789Z"
    }
  }
}
```

## Benefits
1. **No Data Loss:** Vote results are preserved when navigating between events
2. **Easy Review:** Return to any voting event to see previous results
3. **Backup:** Auto-save file can be loaded later using "Load JSON" button
4. **Audit Trail:** Each save includes a timestamp
5. **Seamless UX:** Works automatically without user intervention
6. **Smart Saving:** Only downloads file when data actually changes, reducing clutter

## Loading Saved Data
To restore a previously saved voting session:
1. Click the "Load JSON" button
2. Select your `mun-timer-autosave.json` file
3. All voting results will be restored
4. Navigate to voting events to see the saved data

## Notes
- The auto-save file is only downloaded when voting data has changed
- File is NOT downloaded if you just view a voting event without making changes
- File is NOT downloaded if all votes are still at their default values (all zeros)
- Browser settings determine where the file is saved (usually Downloads folder)
- All voting data persists through JSON save/load operations
- The feature works with all voting modes (Simple, Two-Thirds, Security Council, Consensus)
