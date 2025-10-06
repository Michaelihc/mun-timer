# MUN Timer
A Customizable GUI timer designed for MUN. 

Vibe-coded using **Claude Sonnet 4.5**. Initial Prompt:
> Create a simple flexible timer app for a Model United Nation (MUN).
>
> On the left, there is a numbered list of topics/agenda which can be reordered using up and down buttons, and on the right, there is a timeline of events which can also be reordered. The timeline should be interactable, clicking an event sets the current event to that event. In the center there is the title and subtitle of the current event, and potentially a topic. There could also be a timer if appropriate, the timer should have a pause/resume/reset function, and for moderated caucus there should be two timers, a total time and timer per speaker. There could also be a vote counter/visualize when appropriate, where votes are inputted. 
>
> On the bottom there are all the delegates and the chair, represented by the letters of their country (or in the case of the chair just a human icon). The order and title events, whether a timer is needed, the time and delegates are all saved in json format, which can be editied in the app or copied to elsewhere. Furthermore, a new mod/unmod caucus, voting etc can be added on the fly via a GUI panel. 
>
> Build this using HTML CSS and JS. Include the default json in the code.

# Screenshots:
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/970ca463-e6fb-422d-b293-8ce002d95b5b" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/55079492-8a9d-4372-88b0-e3ad3845ac08" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/ad3248a0-c82f-4af3-8d14-6b92e19fa2b6" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/f3959f81-e518-4abb-87f6-27c0bda8bac3" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/ab270698-e9b6-46eb-959e-653ef8c01d4f" />
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/b1f2f437-3efd-4598-9536-f36cdade5395" />

67

## Save/Load JSON

- Save JSON: Click "Save JSON" to download the current configuration (topics, events, delegates, chair) as a `.json` file. The filename includes a timestamp.
- Load JSON: Click "Load JSON" and choose a previously saved `.json` file to restore the configuration. The file is validated for basic shape before applying.

Notes:
- Loading JSON will reset the current event selection and re-render the UI.
- The expected schema matches the `appData` object used by the app: `{ topics: Topic[], events: Event[], delegates: Delegate[], chair: { name: string } }`.
