# MUN Timer
A customizable GUI timer tailored for Model United Nations (MUN) sessions. Designed for single-client use by the chair, it enables hybrid MUN formats—seamlessly blending online and in-person participants—without requiring any network connectivity. 

# Features
- Timeline to keep track of events over multiple sessions
- Feature-rich Voting and Motioning System
- Simple Roll Calls
- Caucus timing
- Flexible events
- Visual alerts and audio cues

# Screenshots:
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/f6c7ad60-40f3-4944-91e1-4dd11a88290b" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/e254dd08-8667-40f7-bf13-d7250865a504" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/030e65a1-1a26-48fe-8a27-1d8dabe9b6ed" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/c5345578-276c-4162-be21-591b5eea3a35" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/78cf2cfb-3021-4d5b-b54d-02909591fa18" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/25b92e04-3fad-484a-a3f2-c1ed5f5816df" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/7d0d94f2-ab94-46f6-9dd1-8b7c282c62eb" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/b163de27-ba99-47c6-b5a6-5cff5349d5c3" />
67

## Save/Load JSON

- Save JSON: Click "Save JSON" to download the current configuration (topics, events, delegates, chair) as a `.json` file. The filename includes a timestamp.
- Load JSON: Click "Load JSON" and choose a previously saved `.json` file to restore the configuration. The file is validated for basic shape before applying.

Notes:
- Loading JSON will reset the current event selection and re-render the UI.
- The expected schema matches the `appData` object used by the app: `{ topics: Topic[], events: Event[], delegates: Delegate[], chair: { name: string } }`.

## JSON-configurable timers for all events

- Any event can optionally include a `timer` property (number of seconds). When present and greater than zero, the center panel will show a single timer UI with Start/Pause/Reset controls and a quick input to adjust seconds on the fly.
- This works for general events and also appears beneath the Voting UI if `timer` is set on a `voting` event.
- Existing time fields still apply for specific event types:
	- Moderated caucus: `totalTime` and `speakerTime`
	- Unmoderated caucus: `duration`
	- Optional: `timer` can still be added if a separate single-timer is desired.

### Example event snippet

```
{
	"id": 42,
	"type": "general",
	"title": "Announcements",
	"subtitle": "Logistics",
	"topicId": null,
	"timer": 300
}
```
