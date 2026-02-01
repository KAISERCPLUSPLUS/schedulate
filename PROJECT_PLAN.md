# Irregular Task Scheduler — Project Plan

## The Problem

Regular recurring tasks are easy—weekly meetings go in the calendar. But **irregular recurring tasks** are a pain:

- Clean the bathroom (every 5 weeks?)
- Descale the coffee machine (every 3 months)
- Rotate the mattress (twice a year)
- Clean the gutters (once a year, but when?)
- Replace water filter (every 4 months)

These tasks share common problems:

1. **Unpredictable intervals** — Not weekly/monthly, so calendar repeat doesn't fit
2. **Flexible timing** — "Sometime this week" rather than "Tuesday at 3pm"
3. **Easy to forget** — No natural reminder until it's overdue
4. **Collision hell** — Multiple irregular tasks might all come due the same week

## The Solution

An app that:

1. **Tracks irregular recurring tasks** with custom intervals
2. **Spreads out conflicting tasks** when multiple are due around the same time
3. **Sends smart notifications** when it's time to schedule (not do) the task
4. **Deep-links to Google Calendar** with a pre-filled event you can drag to fit your schedule
5. **Verifies scheduling** by checking if you actually added it to your calendar

### Why Google Calendar Integration?

Instead of building yet another calendar app:

- Leverage Google Calendar's excellent drag-and-drop UI
- No need to reinvent scheduling visualization
- Integrates with existing workflow
- Partner sharing comes "free" via shared calendars (future)

---

## Technical Feasibility Analysis

### Hinder 1: Deep-linking to Google Calendar

**Status: ✅ Fully Possible**

Both platforms support opening Google Calendar with pre-filled event details:

**Android:**

```
Intent with action: Intent.ACTION_INSERT
Data: content://com.android.calendar/events
Extras: title, beginTime, endTime, description
```

**iOS:**

```
URL: googlecalendar://?action=create&title=...&dates=...
Or: https://calendar.google.com/calendar/render?action=TEMPLATE&...
```

**Web fallback (universal):**

```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text=Clean+Bathroom
  &dates=20260201T100000/20260201T110000
  &details=Scheduled+via+TaskFlow
```

**Important nuance:** You cannot create a "floating draft" that hovers until placed. Instead, you create an event at a _suggested_ time (e.g., Saturday 10am), and the user moves it. Functionally identical to the vision.

### Hinder 2: Detecting if User Actually Scheduled

**Status: ✅ Possible with Google Calendar API**

Flow:

1. App requests OAuth permission to read user's calendar
2. User clicks notification → deep-link opens Google Calendar
3. On app resume (or after delay), query Calendar API for matching event
4. Match criteria: title contains task name, within expected date range
5. If found → mark task as scheduled, calculate next due date
6. If not found after X hours → send follow-up reminder

**Complexity:** Medium. Requires OAuth implementation, but well-documented.

**Alternative (simpler V1):** Ask user to confirm "Did you schedule it?" with Yes/Snooze buttons. Less elegant but faster to build.

### Hinder 3: Does This Already Exist?

**Status: 🟡 Partial Overlap, No Exact Match**

| App            | What It Does                                            | Missing                                                  |
| -------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| **Tody**       | Cleaning schedules with "freshness" decay visualization | No external calendar integration                         |
| **Sweepy**     | Household chores with custom intervals                  | No deep-link to Google Calendar                          |
| **Due**        | Persistent nagging reminders                            | No scheduling logic, no calendar                         |
| **Recurrence** | Custom recurring reminders                              | No conflict spreading, no calendar integration           |
| **Todoist**    | Tasks with custom recurrence                            | No "schedule into calendar" flow, no conflict resolution |
| **Structured** | Time-blocking calendar app                              | Is its own calendar, doesn't integrate                   |

**Your differentiator:** "Smart scheduling assistant that feeds into Google Calendar" — helps you _decide when_ to do things, not manage yet another calendar.

---

## Technical Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────────────┐
│                 React Native + Expo + TypeScript             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    App Components                      │  │
│  │  • Task List Screen (CRUD for irregular tasks)         │  │
│  │  • Dashboard (upcoming/overdue at a glance)            │  │
│  │  • Settings (notification preferences, calendar link)  │  │
│  └────────────────────────────────────────────────────────┘  │
│                            │                                 │
│           ┌────────────────┼────────────────┐                │
│           ▼                ▼                ▼                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐      │
│  │   Local     │  │  Background  │  │ Google Calendar │      │
│  │  Storage    │  │ Notifications│  │   Integration   │      │
│  │(AsyncStorage│  │ (expo-notif) │  │  (OAuth + API)  │      │
│  │ + Zustand)  │  │              │  │                 │      │
│  └─────────────┘  └──────────────┘  └─────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface Task {
    id: string;
    name: string;
    description?: string;

    // Scheduling
    intervalDays: number; // e.g., 35 for "every 5 weeks"
    flexibilityDays: number; // e.g., 7 means "within a week is fine"
    preferredDayOfWeek?: number; // 0-6, optional preference
    durationMinutes: number; // How long the task takes

    // State
    lastCompletedDate?: string; // ISO date
    nextDueDate: string; // ISO date (calculated)
    status: "pending" | "notified" | "scheduled" | "overdue";

    // Tracking
    scheduledEventId?: string; // Google Calendar event ID if scheduled
    snoozeCount: number; // How many times snoozed

    createdAt: string;
    updatedAt: string;
}

interface AppSettings {
    notificationTime: string; // e.g., "09:00" - when to send daily digest
    advanceNoticeDays: number; // How many days before due to start notifying
    googleCalendarLinked: boolean;
    selectedCalendarId?: string;
}
```

### Scheduling Algorithm (Conflict Resolution)

When multiple tasks are due in the same period:

```typescript
function spreadTasks(tasks: Task[], windowDays: number): ScheduleSuggestion[] {
    // 1. Sort by flexibility (least flexible first)
    // 2. Sort by overdue status (most overdue first)
    // 3. Assign to available slots, respecting:
    //    - preferredDayOfWeek if set
    //    - Maximum tasks per day (configurable, default 1)
    //    - Flexibility window
    // 4. Return suggested dates for each task
}
```

---

## Technology Stack

### Why These Choices

| Technology             | Why                                                                           | Alternatives Considered                                        |
| ---------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **React Native**       | Leverages existing React knowledge, mature ecosystem                          | Flutter (new language), native (2x work)                       |
| **Expo**               | Professional toolchain, handles hard parts (notifications, builds), not a toy | Bare React Native (more setup pain)                            |
| **TypeScript**         | Static typing, better refactoring, catches bugs early                         | Plain JS (no thanks)                                           |
| **Zustand**            | Simple state management, TypeScript-first, minimal boilerplate                | Redux (considered, too much ceremony), Context (scales poorly) |
| **AsyncStorage**       | Simple key-value storage, works offline                                       | SQLite (overkill for this), Realm (complex)                    |
| **expo-notifications** | Cross-platform notifications with Expo integration                            | Native modules (more setup)                                    |
| **expo-auth-session**  | OAuth flows made manageable                                                   | Building OAuth from scratch (painful)                          |

### Backend (V1: None Required)

For V1, everything lives on-device:

- Tasks stored in AsyncStorage
- Google Calendar API called directly from app
- No user accounts, no sync

**Future (V2+):** Add Supabase for:

- User accounts
- Cross-device sync
- Partner sharing

---

## Feature Roadmap

### V1 — Personal MVP (Target: 4-6 weeks part-time)

- [ ] Create/edit/delete irregular tasks
- [ ] Calculate next due dates based on intervals
- [ ] Local notifications when tasks are due
- [ ] Deep-link to Google Calendar with pre-filled event
- [ ] Manual confirmation ("Did you schedule it?")
- [ ] Simple dashboard showing upcoming/overdue

### V2 — Google Calendar Integration

- [ ] OAuth flow to link Google Calendar
- [ ] Automatic detection of scheduled events
- [ ] Mark task complete when event passes
- [ ] Two-way sync (if event deleted, re-notify)

### V3 — Smart Scheduling

- [ ] Conflict detection and spreading algorithm
- [ ] "Schedule all" bulk action
- [ ] Weekly digest notification
- [ ] Analytics (how often you snooze, completion rate)

### V4 — Partner Mode

- [ ] User accounts (Supabase)
- [ ] Shared task lists
- [ ] Assign tasks to household members
- [ ] Shared calendar support

---

## Getting Started

### Prerequisites

1. **Node.js 24.11.1** — Install via [nvm](https://github.com/nvm-sh/nvm), project has `.nvmrc`
2. **Expo CLI** — Installed as project dependency (no global install needed)
3. **iOS Simulator** (Mac) or **Android Emulator** — Or physical device with Expo Go app
4. **VS Code** — Recommended, with ESLint and Prettier extensions
5. **Google Cloud Console account** — For Calendar API credentials (needed in V2)

### Step 1: Initialize the Project

**Already done.** Project initialized with:

- Expo + TypeScript
- React Native Paper (UI components)
- Zustand (state management)
- ESLint with strict TypeScript rules + Prettier
- 4-space indentation (`.editorconfig`, `.prettierrc.js`)
- React Navigation (chosen over Expo Router for transferable knowledge)

To set up:

```bash
nvm use              # Uses .nvmrc (Node 24.11.1)
npm install          # Install dependencies
npx expo start       # Start dev server
```

### Step 2: Project Structure

Folder structure (already created):

```
app/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   └── Button.tsx
│   ├── screens/            # Full screens
│   │   ├── HomeScreen.tsx
│   │   ├── TaskDetailScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── store/              # Zustand stores
│   │   ├── taskStore.ts
│   │   └── settingsStore.ts
│   ├── services/           # External integrations
│   │   ├── notifications.ts
│   │   ├── calendar.ts
│   │   └── storage.ts
│   ├── utils/              # Pure functions
│   │   ├── scheduling.ts   # Due date calculations
│   │   └── dateHelpers.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   └── theme/              # Theming (light/dark)
│       └── index.ts
├── .editorconfig           # Editor formatting rules
├── .nvmrc                  # Node version lock
├── .prettierrc.js          # Prettier config
├── eslint.config.mjs       # ESLint flat config
├── app.json
├── tsconfig.json
└── package.json
```

### Step 3: First Milestone — Validate Calendar Deep-Link

Before building the full app, validate the core assumption works:

```typescript
// src/services/calendar.ts
import * as Linking from "expo-linking";
import { format, addHours } from "date-fns";

export function openGoogleCalendarWithEvent(
    title: string,
    startTime: Date,
    durationMinutes: number,
    description?: string,
): Promise<void> {
    const endTime = addHours(startTime, durationMinutes / 60);

    // Format: YYYYMMDDTHHmmss (no dashes, no colons)
    const formatForGoogle = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates: `${formatForGoogle(startTime)}/${formatForGoogle(endTime)}`,
        details: description || "Scheduled via Irregular Task Scheduler",
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;

    return Linking.openURL(url);
}
```

```typescript
// Quick test in App.tsx
import { Button, View } from 'react-native';
import { openGoogleCalendarWithEvent } from './src/services/calendar';

export default function App() {
  const testCalendarLink = () => {
    const saturday = new Date();
    saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));
    saturday.setHours(10, 0, 0, 0);

    openGoogleCalendarWithEvent(
      'Clean Bathroom',
      saturday,
      60,
      'Scheduled via Task Scheduler'
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button title="Test Calendar Link" onPress={testCalendarLink} />
    </View>
  );
}
```

Run with `npx expo start`, test on your phone. If Google Calendar opens with the event pre-filled, you're good to proceed.

### Step 4: Build Core Task Management

1. **Define types** (`src/types/index.ts`) — Copy the Task interface from above
2. **Create Zustand store** (`src/store/taskStore.ts`) — CRUD operations for tasks
3. **Build TaskForm component** — Create/edit task with interval settings
4. **Build HomeScreen** — List of tasks with status indicators
5. **Persist to AsyncStorage** — Zustand middleware for persistence

### Step 5: Add Notifications

```typescript
// src/services/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export async function registerForPushNotifications() {
    if (!Device.isDevice) {
        console.log("Notifications require physical device");
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("Notification permission denied");
        return null;
    }

    // Configure how notifications appear when app is in foreground
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });

    return true;
}

export async function scheduleTaskNotification(taskId: string, taskName: string, triggerDate: Date) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Time to schedule a task",
            body: `"${taskName}" is due soon. Tap to add it to your calendar.`,
            data: { taskId, action: "schedule" },
        },
        trigger: {
            date: triggerDate,
        },
    });
}
```

### Step 6: Handle Notification Responses

```typescript
// In App.tsx or a dedicated hook
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { openGoogleCalendarWithEvent } from "./src/services/calendar";
import { useTaskStore } from "./src/store/taskStore";

function useNotificationHandler() {
    const getTask = useTaskStore((state) => state.getTask);

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const { taskId } = response.notification.request.content.data;
            const task = getTask(taskId);

            if (task) {
                // Calculate suggested time (next Saturday at 10am, for example)
                const suggestedTime = calculateSuggestedTime(task);
                openGoogleCalendarWithEvent(task.name, suggestedTime, task.durationMinutes, task.description);
            }
        });

        return () => subscription.remove();
    }, []);
}
```

---

## Learning Resources

### Essential (Do These First)

1. **React Native Basics**
    - [Official Tutorial](https://reactnative.dev/docs/tutorial) — 2-3 hours
    - [Expo Tutorial](https://docs.expo.dev/tutorial/introduction/) — 2-3 hours

2. **TypeScript**
    - [TypeScript in 5 Minutes](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
    - [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

3. **Zustand**
    - [Zustand GitHub](https://github.com/pmndrs/zustand) — Read the README, it's short

### When Needed

4. **Expo Notifications**
    - [Expo Notifications Guide](https://docs.expo.dev/push-notifications/overview/)

5. **Google Calendar API**
    - [Google Calendar API Quickstart](https://developers.google.com/calendar/api/quickstart/js)
    - [OAuth 2.0 for Mobile](https://developers.google.com/identity/protocols/oauth2/native-app)

6. **App Store Deployment**
    - [Expo EAS Build](https://docs.expo.dev/build/introduction/)
    - [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/) — Read before building to avoid rejection

---

## Estimated Timeline

| Phase                            | Duration      | Outcome                  |
| -------------------------------- | ------------- | ------------------------ |
| Learn React Native + Expo basics | 1-2 weeks     | Can build simple screens |
| Build task CRUD + storage        | 1 week        | Working task list        |
| Add notifications                | 3-4 days      | Reminders work           |
| Calendar deep-linking            | 2-3 days      | End-to-end flow works    |
| Polish + testing                 | 1 week        | Usable by you            |
| **Total V1**                     | **4-6 weeks** | Personal MVP             |
| Google Calendar API integration  | 2 weeks       | Auto-detection           |
| App Store submission             | 1-2 weeks     | Public release           |

---

## Open Questions to Decide

1. **Notification timing:** Daily digest at fixed time, or individual notifications per task?
2. **Snooze behavior:** Snooze for hours? Days? "Until tomorrow"?
3. **Overdue handling:** Aggressive re-notification, or passive "overdue" badge?
4. **Time suggestions:** Always Saturday morning? Respect preferred day? ML-based?
5. **Task completion:** Mark done when calendar event passes, or require manual confirmation?

---

## Success Criteria

**V1 is successful if:**

- [ ] You actually use it for 2+ weeks
- [ ] You schedule at least 3 irregular tasks through it
- [ ] It successfully reminds you of something you would have forgotten
- [ ] The Google Calendar flow feels natural, not clunky

**Then and only then:** Consider V2 features and public release.

---

## Visual Design Notes

_Inspired by [Cashew](https://cashewapp.web.app/) — a budgeting app with a clean, approachable aesthetic._

### Design Principles

| Principle                  | Application                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| **Minimalist clarity**     | Avoid visual clutter; every element should earn its place        |
| **Functional simplicity**  | UI serves the task, not the other way around                     |
| **Approachable tone**      | Friendly without being childish; professional without being cold |
| **Progressive disclosure** | Show what's needed now, reveal complexity when requested         |

### Color Palette

- **Base:** Neutral backgrounds (light grays, off-whites)
- **Primary text:** Near-black (`rgba(0,0,0,0.87)`) for readability
- **Accent:** One or two accent colors max for primary actions (e.g., `#6200ee` purple or similar)
- **Status colors:** Subtle, not alarming — muted red for overdue, soft green for scheduled
- **Avoid:** Bright/flashy colors, gradients, heavy shadows

### Typography

- **Font:** System default (San Francisco on iOS, Roboto on Android) — no custom fonts needed for V1
- **Hierarchy:** Clear distinction between titles, body text, and labels through size/weight
- **Sizing:** Standard Material Design scale (12/14/16/20/24sp)

### Components

**Cards:**

- Clean edges, minimal shadow (1-2dp elevation)
- Generous padding (16px standard)
- Task cards show: name, due status, interval — nothing more

**Buttons:**

- Primary action: Filled, accent color
- Secondary: Outlined or text-only
- Ripple feedback on press (React Native Paper provides this)

**Inputs:**

- Floating labels that animate on focus
- Outlined style (not underlined)
- Clear error states without being aggressive

### Micro-interactions

- **Transitions:** 150-250ms duration, ease-in-out
- **Ripple effects:** On all tappable elements
- **State changes:** Smooth, not jarring
- **Loading states:** Subtle spinners or skeleton screens, not blocking modals

### Layout

- **Card-based:** Tasks as cards in a scrollable list
- **Spacing:** Consistent 8px grid (8, 16, 24, 32px)
- **Mobile-first:** Touch targets minimum 48x48px
- **Safe areas:** Respect notches, home indicators

### UI Library Recommendation

**React Native Paper** — Material Design components for React Native

- Provides: Cards, buttons, text inputs, FAB, ripple effects, theming
- TypeScript support out of the box
- Handles dark mode theming

```bash
npm install react-native-paper react-native-vector-icons
```

### Example Theme Configuration

```typescript
// src/theme/index.ts
import { MD3LightTheme, configureFonts } from "react-native-paper";

export const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: "#6200ee",
        secondary: "#03dac6",
        background: "#fafafa",
        surface: "#ffffff",
        error: "#b00020",
    },
    roundness: 8,
};
```

### What NOT to Do

- Don't add animations just because you can
- Don't use more than 2-3 colors
- Don't create custom components when Paper provides them
- Don't sacrifice usability for aesthetics
- Don't over-design V1 — function first, polish later

---

## Future Considerations

Things intentionally deferred to keep V1 simple, but designed to be easy to add later.

### Type Safety Improvements

- **Branded types for dates** — Currently using `string` for ISO date fields. Could add:

    ```typescript
    type ISODateString = string & { readonly __brand: "ISODateString" };
    ```

    Zero runtime cost, prevents accidental string assignment.

- **Runtime validation** — Libraries like `zod` for validating data shape at boundaries (API responses, storage reads).

### Internationalization (i18n)

- All user-facing strings are currently hardcoded in English
- Extract to a translation system when/if needed
- Tedious but mechanical refactor

### Timezone Handling

- Current approach: store all dates as UTC ISO strings, convert to local for display
- JavaScript `Date` handles timezone conversion automatically
- Multi-user timezone sync is a V4 concern (partner mode)

### Accessibility

- React Native Paper provides baseline accessibility
- Future: audit with screen reader, add ARIA labels where needed

### Testing

- No tests in V1 — focus on getting the app working
- Future: Jest + React Native Testing Library for unit/component tests
- E2E: Detox or Maestro

### CI Pipeline

- No CI in V1 — manual linting and type checking
- Future: GitHub Actions workflow for:
    - `npm run lint` on PR
    - `npm run typecheck` on PR
    - EAS Build for preview builds on merge to main
    - Automated App Store deployment on release tags

### Backend

- V1 is entirely on-device (AsyncStorage + Zustand)
- Future (V2+): Supabase for:
    - User authentication
    - Cross-device sync
    - Partner/household sharing
- Alternative: Firebase if deeper Google Calendar integration needed
