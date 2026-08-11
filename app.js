```javascript
const STORAGE_KEY = "life-organizer-v1";

const defaultState = {
  spaces: [
    {
      id: createId(),
      name: "Home",
      calendar: "Apple Calendar"
    },
    {
      id: createId(),
      name: "School",
      calendar: "Google Calendar"
    }
  ],

  activeSpace: null,

  tasks: [],

  lists: {},

  settings: {
    notifyHigh: true,
    notifyRemaining: true
  }
};


let state = loadState();

let recognition = null;


/* =========================================
   INITIALIZE
========================================= */

if (!state.activeSpace && state.spaces.length) {
  state.activeSpace = state.spaces[0].id;
  saveState();
}


/* =========================================
   STORAGE
========================================= */

function createId() {

  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString() +
    Math.random().toString(16).slice(2);
}


function loadState() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {

      return structuredClone(
        defaultState
      );

    }

    const parsed = JSON.parse(saved);

    return {

      ...structuredClone(defaultState),

      ...parsed

    };

  } catch (error) {

    console.error(
      "Could not load saved data:",
      error
    );

    return structuredClone(
      defaultState
    );

  }

}


function saveState() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}


/* =========================================
   HELPERS
========================================= */

function escapeHtml(value) {

  return String(value)

    .replace(
      /[&<>"']/g,

      character => {

        const characters = {

          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"

        };

        return characters[
          character
        ];

      }

    );

}


function getActiveSpace() {

  return state.spaces.find(
    space =>
      space.id === state.activeSpace
  ) || state.spaces[0];

}


function countOpenTasks(spaceId) {

  return state.tasks.filter(
    task =>
      task.spaceId === spaceId &&
      !task.done
  ).length;

}


/* =========================================
   RENDER APP
========================================= */

function renderApp() {

  renderSpaces();

  renderSpaceHeader();

  renderTasks();

  renderSpaceSettings();

}


/* =========================================
   SPACES
========================================= */

function renderSpaces() {

  const container =
    document.getElementById(
      "spaces"
    );

  container.innerHTML =
    state.spaces.map(
      space => `

        <button

          class="space-btn ${
            space.id === state.activeSpace
              ? "active"
              : ""
          }"

          onclick="
            selectSpace('${space.id}')
          "

        >

          ${escapeHtml(space.name)}

        </button>

      `
    ).join("");

}


function selectSpace(id) {

  state.activeSpace = id;

  saveState();

  renderApp();

}


/* =========================================
   SPACE HEADER
========================================= */

function renderSpaceHeader() {

  const space =
    getActiveSpace();

  if (!space) return;


  document.getElementById(
    "spaceTitle"
  ).textContent =
    space.name;


  document.getElementById(
    "spaceSubtitle"
  ).textContent =

    `${
      space.calendar || "No calendar connected"
    } • ${
      countOpenTasks(space.id)
    } open tasks`;

}


/* =========================================
   TASK CAPTURE
========================================= */

function addTaskFromInput() {

  const input =
    document.getElementById(
      "captureInput"
    );

  const text =
    input.value.trim();


  if (!text) {

    showStatus(
      "Tell me what you need to remember."
    );

    return;

  }


  addTask(
    text,
    "Typed"
  );


  input.value = "";

}


function addTask(
  text,
  source = "Manual"
) {

  const space =
    getActiveSpace();


  if (!space) return;


  const parsed =
    analyzeTask(text);


  const task = {

    id: createId(),

    spaceId:
      space.id,

    title:
      parsed.title,

    priority:
      parsed.priority,

    due:
      parsed.due,

    group:
      parsed.group,

    source,

    done: false,

    createdAt:
      new Date().toISOString()

  };


  state.tasks.unshift(task);


  saveState();

  renderApp();


  showStatus(
    "✓ Added. Temporary input is not stored separately."
  );


  inputFocus();

}


/* =========================================
   SIMPLE AI-STYLE TASK ANALYSIS
========================================= */

function analyzeTask(text) {

  const lower =
    text.toLowerCase();


  let priority =
    "Normal";


  if (

    lower.includes("urgent") ||

    lower.includes("asap") ||

    lower.includes("important") ||

    lower.includes("high priority")

  ) {

    priority = "High";

  }


  if (

    lower.includes("today")

  ) {

    priority = "High";

  }


  let due = null;


  if (
    lower.includes("today")
  ) {

    due =
      formatDateForStorage(
        new Date()
      );

  }


  else if (
    lower.includes("tomorrow")
  ) {

    const date =
      new Date();

    date.setDate(
      date.getDate() + 1
    );

    due =
      formatDateForStorage(
        date
      );

  }


  else {

    const days = [

      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"

    ];


    const dayIndex =
      days.findIndex(
        day =>
          lower.includes(day)
      );


    if (dayIndex >= 0) {

      const date =
        new Date();


      let difference =
        (dayIndex -
          date.getDay() +
          7) % 7;


      if (difference === 0) {

        difference = 7;

      }


      date.setDate(
        date.getDate() +
        difference
      );


      due =
        formatDateForStorage(
          date
        );

    }

  }


  let group =
    "General";


  if (
    lower.includes("mentor")
  ) {

    group = "Mentoring";

  }

  else if (

    lower.includes("email") ||

    lower.includes("e-mail")

  ) {

    group = "Email";

  }

  else if (

    lower.includes("read") ||

    lower.includes("reading") ||

    lower.includes("book") ||

    lower.includes("article")

  ) {

    group = "Reading";

  }

  else if (

    lower.includes("buy") ||

    lower.includes("shopping") ||

    lower.includes("grocery") ||

    lower.includes("groceries")

  ) {

    group = "Shopping";

  }

  else if (

    lower.includes("material") ||

    lower.includes("materials") ||

    lower.includes("supplies")

  ) {

    group = "Materials";

  }

  else if (

    lower.includes("call") ||

    lower.includes("phone")

  ) {

    group = "Calls";

  }

  else if (

    lower.includes("meeting")

  ) {

    group = "Meetings";

  }


  let title =
    text

      .replace(
        /\b(today|tomorrow|urgent|asap|high priority)\b/gi,
        ""
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  return {

    title:
      title || text,

    priority,

    due,

    group

  };

}


function formatDateForStorage(
  date
) {

  return date
    .toISOString()
    .slice(0, 10);

}


/* =========================================
   TASK DISPLAY
========================================= */

function renderTasks() {

  const container =
    document.getElementById(
      "groups"
    );


  const space =
    getActiveSpace();


  if (!space) {

    container.innerHTML =
      '<div class="group"><div class="empty">Create a space to get started.</div></div>';

    return;

  }


  const tasks =
    state.tasks.filter(
      task =>
        task.spaceId ===
        space.id
    );


  if (!tasks.length) {

    container.innerHTML = `

      <div class="group">

        <div class="empty">

          Nothing here yet.

          <br><br>

          Add a task above or create a list.

        </div>

      </div>

    `;

    return;

  }


  const groups = {};


  tasks.forEach(
    task => {

      if (!groups[task.group]) {

        groups[task.group] = [];

      }


      groups[
        task.group
      ].push(task);

    }
  );


  container.innerHTML =

    Object.entries(groups)

      .map(
        ([groupName, groupTasks]) => `

          <div class="group">

            <div class="group-head">

              <span class="group-title">

                ${escapeHtml(
                  groupName
                )}

              </span>

              <span class="count">

                ${
                  groupTasks.filter(
                    task =>
                      !task.done
                  ).length
                }

                open

              </span>

            </div>


            ${groupTasks
              .map(
                task =>
                  renderTask(task)
              )
              .join("")
            }

          </div>

        `
      )

      .join("");

}


function renderTask(task) {

  return `

    <div class="task">

      <input

        type="checkbox"

        ${
          task.done
            ? "checked"
            : ""
        }

        onchange="
          toggleTask('${task.id}')
        "

      >


      <div>

        <div

          class="task-title ${
            task.done
              ? "done"
              : ""
          }"

        >

          ${escapeHtml(
            task.title
          )}

        </div>


        <div class="meta">

          ${
            task.priority === "High"

              ? `

                <span class="pill priority-high">

                  High

                </span>

              `

              : ""

          }


          ${
            task.due

              ? `

                <span class="pill">

                  Due ${
                    formatDisplayDate(
                      task.due
                    )
                  }

                </span>

              `

              : ""

          }


          <span class="pill">

            ${
              escapeHtml(
                task.source
              )
            }

          </span>

        </div>

      </div>


      <div class="task-actions">

        <button

          onclick="
            deleteTask('${task.id}')
          "

          title="Delete task"

        >

          🗑️

        </button>

      </div>

    </div>

  `;

}


/* =========================================
   TASK ACTIONS
========================================= */

function toggleTask(id) {

  const task =
    state.tasks.find(
      item =>
        item.id === id
    );


  if (!task) return;


  task.done =
    !task.done;


  saveState();

  renderApp();

}


function deleteTask(id) {

  state.tasks =
    state.tasks.filter(
      task =>
        task.id !== id
    );


  saveState();

  renderApp();

}


/* =========================================
   DATE DISPLAY
========================================= */

function formatDisplayDate(
  value
) {

  return new Date(
    value + "T12:00:00"
  ).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric"
    }
  );

}


/* =========================================
   STATUS
========================================= */

function showStatus(
  message
) {

  const status =
    document.getElementById(
      "captureStatus"
    );


  status.textContent =
    message;


  setTimeout(
    () => {

      status.textContent =
        "";

    },
    3000
  );

}


function inputFocus() {

  document.getElementById(
    "captureInput"
  ).focus();

}


/* =========================================
   VOICE INPUT
========================================= */

function startVoiceInput() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

    alert(
      "Voice input isn't supported by this browser. Try Chrome on Android or Safari on iPhone."
    );

    return;

  }


  if (recognition) {

    recognition.stop();

    return;

  }


  recognition =
    new SpeechRecognition();


  recognition.lang =
    navigator.language ||
    "en-US";


  recognition.interimResults =
    false;


  recognition.maxAlternatives =
    1;


  recognition.onstart =
    () => {

      document
        .getElementById(
          "voiceBtn"
        )
        .classList.add(
          "listening"
        );


      showStatus(
        "🎤 Listening..."
      );

    };


  recognition.onresult =
    event => {

      const transcript =
        event
          .results[0][0]
          .transcript;


      document.getElementById(
        "captureInput"
      ).value =
        transcript;


      showStatus(
        "Ready to add."
      );

    };


  recognition.onerror =
    event => {

      showStatus(
        "Voice input error: " +
        event.error
      );

    };


  recognition.onend =
    () => {

      document
        .getElementById(
          "voiceBtn"
        )
        .classList.remove(
          "listening"
        );


      recognition =
        null;

    };


  recognition.start();

}


/* =========================================
   SHARE / TEXT
========================================= */

async function shareText() {

  const input =
    document.getElementById(
      "captureInput"
    );


  const text =
    input.value.trim();


  if (!text) {

    showStatus(
      "Paste or type the message first."
    );

    return;

  }


  if (
    navigator.share
  ) {

    try {

      await navigator.share({

        title:
          "Life Organizer",

        text:
          "Turn this into a task: " +
          text

      });

    }

    catch (error) {

      console.log(
        "Share cancelled."
      );

    }

  }

  else {

    try {

      await navigator
        .clipboard
        .writeText(text);


      showStatus(
        "Text copied. Paste the message here and tap Add Task."
      );

    }

    catch {

      showStatus(
        "Copy isn't available on this device."
      );

    }

  }

}


/* =========================================
   CUSTOM LISTS
========================================= */

function openNewList() {

  document
    .getElementById(
      "listDialog"
    )
    .showModal();

}


function createList() {

  const input =
    document.getElementById(
      "listName"
    );


  const name =
    input.value.trim();


  if (!name) return;


  const id =
    createId();


  state.lists[id] = {

    id,

    name,

    spaceId:
      getActiveSpace().id,

    items: []

  };


  saveState();


  input.value = "";


  document
    .getElementById(
      "listDialog"
    )
    .close();


  showStatus(
    `✓ Created "${name}" list.`
  );

}


/* =========================================
   SETTINGS
========================================= */

function openSettings() {

  document
    .getElementById(
      "settingsDialog"
    )
    .showModal();

}


function renderSpaceSettings() {

  const container =
    document.getElementById(
      "spaceSettings"
    );


  if (!container) return;


  container.innerHTML =

    state.spaces

      .map(
        space => `

          <div class="space-row">

            <input

              value="${escapeHtml(
                space.name
              )}"

              onchange="
                renameSpace(
                  '${space.id}',
                  this.value
                )
              "

            >


            <select

              onchange="
                changeCalendar(
                  '${space.id}',
                  this.value
                )
              "

            >

              ${[
                "None",
                "Google Calendar",
                "Apple Calendar",
                "Outlook"

              ]

                .map(
                  calendar => `

                    <option

                      ${
                        space.calendar ===
                        calendar
                          ? "selected"
                          : ""
                      }

                    >

                      ${calendar}

                    </option>

                  `
                )

                .join("")
              }

            </select>

          </div>

        `
      )

      .join("");

}


function renameSpace(
  id,
  newName
) {

  const space =
    state.spaces.find(
      item =>
        item.id === id
    );


  if (!space) return;


  if (!newName.trim()) {

    showStatus(
      "Space name cannot be blank."
    );

    return;

  }


  space.name =
    newName.trim();


  saveState();

  renderApp();

}


function changeCalendar(
  id,
  calendar
) {

  const space =
    state.spaces.find(
      item =>
        item.id === id
    );


  if (!space) return;


  space.calendar =
    calendar;


  saveState();

  renderApp();

}


function addNewSpace() {

  const name =
    prompt(
      "What would you like to call this space?"
    );


  if (!name ||
      !name.trim()) {

    return;

  }


  const newSpace = {

    id: createId(),

    name:
      name.trim(),

    calendar:
      "None"

  };


  state.spaces.push(
    newSpace
  );


  state.activeSpace =
    newSpace.id;


  saveState();

  renderApp();

}


/* =========================================
   NOTIFICATIONS
========================================= */

function requestNotificationPermission() {

  if (
    !("Notification" in window)
  ) {

    return;

  }


  if (
    Notification.permission ===
    "default"
  ) {

    Notification.requestPermission();

  }

}


function sendHighPriorityNotification() {

  if (
    !("Notification" in window)
  ) {

    return;

  }


  if (
    Notification.permission !==
    "granted"
  ) {

    return;

  }


  const today =
    formatDateForStorage(
      new Date()
    );


  const highPriority =
    state.tasks.filter(
      task =>

        task.spaceId ===
          getActiveSpace().id &&

        !task.done &&

        task.priority ===
          "High" &&

        (!task.due ||
          task.due <= today)

    );


  if (!highPriority.length) {

    return;

  }


  new Notification(
    "Life Organizer",
    {

      body:
        `You have ${
          highPriority.length
        } high-priority task${
          highPriority.length === 1
            ? ""
            : "s"
        } today.`

    }
  );

}


/* =========================================
   DELETE LOCAL DATA
========================================= */

function deleteAllLocalData() {

  const confirmed =
    confirm(
      "Delete ALL Life Organizer data stored on this device?"
    );


  if (!confirmed) return;


  localStorage.removeItem(
    STORAGE_KEY
  );


  location.reload();

}


/* =========================================
   BUTTON EVENTS
========================================= */

document
  .getElementById(
    "addTaskBtn"
  )
  .addEventListener(
    "click",
    addTaskFromInput
  );


document
  .getElementById(
    "voiceBtn"
  )
  .addEventListener(
    "click",
    startVoiceInput
  );


document
  .getElementById(
    "shareTextBtn"
  )
  .addEventListener(
    "click",
    shareText
  );


document
  .getElementById(
    "newListBtn"
  )
  .addEventListener(
    "click",
    openNewList
  );


document
  .getElementById(
    "settingsBtn"
  )
  .addEventListener(
    "click",
    openSettings
  );


document
  .getElementById(
    "addSpaceBtn"
  )
  .addEventListener(
    "click",
    addNewSpace
  );


document
  .getElementById(
    "listForm"
  )
  .addEventListener(
    "submit",
    createList
  );


document
  .getElementById(
    "clearDataBtn"
  )
  .addEventListener(
    "click",
    deleteAllLocalData
  );


document
  .getElementById(
    "notifyHigh"
  )
  .addEventListener(
    "change",
    event => {

      state.settings.notifyHigh =
        event.target.checked;

      saveState();

      if (
        event.target.checked
      ) {

        requestNotificationPermission();

      }

    }
  );


document
  .getElementById(
    "notifyRemaining"
  )
  .addEventListener(
    "change",
    event => {

      state.settings.notifyRemaining =
        event.target.checked;

      saveState();

    }
  );


/* =========================================
   START APP
========================================= */

document
  .getElementById(
    "notifyHigh"
  )
  .checked =
    state.settings.notifyHigh;


document
  .getElementById(
    "notifyRemaining"
  )
  .checked =
    state.settings.notifyRemaining;


renderApp();
```
