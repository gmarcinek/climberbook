# Documentation: useEventCounter Hook

## Overview

The `useEventCounter` hook is a custom React hook designed to provide functionality for counting specific types of events within a given date range. It simplifies the process of filtering and counting calendar events based on type and date.

---

## Import

```typescript
import { useEventCounter } from 'path/to/your/hook';
```

## Dependencies

This hook depends on:

- `dayjs` (a lightweight JavaScript date library).
- `getDaysBetweenDates` (a helper function for calculating the days between two dates).

---

## Hook Signature

### Input Parameters

#### `UseEventCounterProps`

The hook accepts a single argument, an object with the following structure:

```typescript
interface UseEventCounterProps {
  events: CalendarEvent[];
}
```

- `events`: An array of event objects with the following properties:
  - `date`: The date of the event (assumed to be in a format compatible with `dayjs`).
  - `type`: A string representing the type of the event.

#### Example

```typescript
const { countEvents } = useEventCounter({ events: calendarEvents });
```

---

## API Methods

### `countEvents`

The primary method returned by the hook, used for counting events within a date range.

#### Input Parameters

```typescript
interface CountEventsProps {
  eventType: string;
  startDate: string;
  endDate: string;
}
```

- `eventType`: A string representing the type of events to filter.
- `startDate`: The start date of the range (in string format compatible with `dayjs`).
- `endDate`: The end date of the range (in string format compatible with `dayjs`).

#### Return Value

The method returns an object containing:

- `days`: The number of days in the date range.
- `eventCount`: The number of events matching the given criteria within the date range.

#### Example

```typescript
const { days, eventCount } = countEvents({
  eventType: 'meeting',
  startDate: '2023-01-01',
  endDate: '2023-01-31',
});
console.log(`Days: ${days}, Event Count: ${eventCount}`);
```

---

## Implementation Details

1. **Validation**: If the `startDate` is after the `endDate`, the method returns `days: 0` and `eventCount: 0`.
2. **Filtering**: Events are filtered based on the following conditions:
   - The event date is within the date range (inclusive).
   - The event type matches the specified `eventType`.
3. **Date Handling**:
   - Uses `dayjs` for parsing and manipulating dates.
   - Adds a buffer of 1 day before `startDate` and after `endDate` to ensure inclusivity.

---

## Returned Object

The hook returns an object containing the `countEvents` method:

```typescript
const { countEvents } = useEventCounter({ events });
```

---

## Example Usage

```typescript
import { useEventCounter } from 'path/to/hook';
import { CalendarEvent } from 'path/to/types';

const calendarEvents: CalendarEvent[] = [
  { date: '2023-01-05', type: 'meeting' },
  { date: '2023-01-15', type: 'conference' },
  { date: '2023-01-20', type: 'meeting' },
];

const App = () => {
  const { countEvents } = useEventCounter({ events: calendarEvents });

  const result = countEvents({
    eventType: 'meeting',
    startDate: '2023-01-01',
    endDate: '2023-01-31',
  });

  console.log(result); // { days: 31, eventCount: 2 }

  return <div>Check console for results</div>;
};

export default App;
```

---

## Notes

- Ensure `events` contains properly formatted date strings.
- The `dayjs` library must be installed and configured if needed.
- The `getDaysBetweenDates` helper is assumed to return an array of days between two `dayjs` instances.

---

## Dependencies

Install required libraries:

```bash
npm install dayjs
```

---

## Testing

Ensure to test with different scenarios, including:

1. Empty `events` array.
2. `startDate` after `endDate`.
3. No matching `eventType`.
4. Events at the edges of the date range.

---

This documentation covers all essential aspects of the `useEventCounter` hook, ensuring a smooth integration into your projects.
