# Timezone Handling in PMO Platform

> **Critical Documentation for International Deployments**
> Understanding how dates and times are stored, processed, and displayed across timezones.

---

## 🎯 Executive Summary

The PMO Platform handles timezones in a **simplified UTC-centric architecture**:

- **All timestamps are stored as UTC** in the database
- **All API responses return UTC timestamps** in ISO 8601 format
- **Frontend displays times in the user's browser timezone**
- **The `User.timezone` field exists but is currently unused**

---

## 🔍 Deep Investigation Findings

### Database Layer (PostgreSQL)

**Column Type:** `timestamp(3) without time zone`

```sql
-- Example from TimeEntrySession table
startTime   | timestamp(3) without time zone | not null
endTime     | timestamp(3) without time zone | not null
createdAt   | timestamp(3) without time zone | not null | CURRENT_TIMESTAMP
```

**PostgreSQL Server Timezone:** `UTC` (verified via `SHOW TIMEZONE;`)

**How It Works:**
1. PostgreSQL server runs in UTC timezone
2. Columns use `timestamp without time zone` (no timezone metadata stored)
3. JavaScript `Date` objects from backend are converted to UTC strings by Prisma
4. PostgreSQL stores the timestamp "as-is" without timezone conversion
5. **Because server is UTC, timestamps are effectively stored as UTC**

**Critical Dependency:** This architecture depends on PostgreSQL server remaining in UTC timezone. If server timezone changes, all stored timestamps become ambiguous.

### Backend Layer (Node.js/Fastify)

**Timestamp Capture:**
```typescript
// From timetracking.service.ts:522
const endTime = new Date(); // JavaScript Date in server's local time
```

**Timestamp Storage:**
```typescript
// Prisma converts JavaScript Date to timestamp for PostgreSQL
await db.timeEntry.create({
  data: {
    startTime: new Date(), // Stored as UTC in PostgreSQL
    endTime: endTime,
  }
});
```

**Timestamp Export (Time Card API):**
```typescript
// From timecard-export.service.ts:174-175
startTime: session.startTime.toISOString(), // "2025-11-24T09:35:00.000Z"
endTime: session.endTime.toISOString(),     // "2025-11-24T11:56:00.000Z"
```

**API Input Validation:**
```typescript
// From timetracking.routes.ts:50-51
const addSessionSchema = z.object({
  startTime: z.coerce.date(), // Parses ISO string "2025-11-24T09:35:00.000Z"
  endTime: z.coerce.date(),   // Creates JavaScript Date object (UTC)
});
```

### Frontend Layer (SvelteKit)

**Timestamp Input (User's Local Timezone):**
```svelte
<!-- HTML datetime-local input captures time in user's browser timezone -->
<input type="datetime-local" bind:value={editSessionStart} />
<!-- Example value: "2025-11-24T09:35" (no timezone indicator) -->
```

**Conversion to UTC for API:**
```typescript
// From frontend/src/routes/(app)/time/+page.svelte:112-113
await api.timetracking.sessions.update(sessionId, {
  startTime: new Date(editSessionStart).toISOString(), // Converts to UTC
  endTime: new Date(editSessionEnd).toISOString(),     // "2025-11-24T14:35:00.000Z"
});
```

**Display (Back to User's Local Timezone):**
```typescript
// From frontend/src/routes/(app)/time/+page.svelte:95-96
editSessionStart = format(parseISO(session.startTime), "yyyy-MM-dd'T'HH:mm");
// Parses UTC ISO string and formats in browser's local timezone
```

---

## ⚠️ Critical Implications for International Usage

### For Time Card API Integrations

When external payroll systems (Workday, PeopleSoft, etc.) call the Time Card API:

1. **Query Parameters (Date Range):**
   ```
   GET /api/timecard/export?startDate=2025-11-24&endDate=2025-11-30
   ```
   - These are **calendar dates only** (no time component)
   - Interpreted as **midnight UTC** for start date
   - Interpreted as **23:59:59.999 UTC** for end date
   - **Implication:** A user working in Tokyo (UTC+9) on Nov 24 local time is actually working on Nov 23 UTC
   - **Solution:** Clients must request date ranges accounting for timezone differences

2. **Response Timestamps (ISO 8601 UTC):**
   ```json
   {
     "startTime": "2025-11-24T09:35:00.000Z",
     "endTime": "2025-11-24T11:56:00.000Z"
   }
   ```
   - The `Z` suffix indicates UTC (Zulu time)
   - Payroll systems **MUST** convert these to their local timezone for processing
   - **Example:** `09:35 UTC` = `05:35 EST` = `18:35 JST`

3. **Date Field (Calendar Date Only):**
   ```json
   {
     "date": "2025-11-24"
   }
   ```
   - This represents the **UTC calendar date** when the time was logged
   - May differ from the user's local calendar date

### For Multi-Timezone Organizations

**Scenario:** Company has teams in:
- San Francisco (UTC-8)
- London (UTC+0)
- Bangalore (UTC+5:30)

**Example Time Entry:**
- Engineer in Bangalore starts timer at **9:00 AM IST** (local time)
- System stores: `2025-11-24T03:30:00.000Z` (UTC)
- London manager sees: **3:30 AM GMT** (correctly converted)
- San Francisco sees: **7:30 PM PST previous day** (correctly converted)

**For Weekly Reports:**
A user in Tokyo working Monday 9 AM JST is actually working Sunday 12 AM UTC. Weekly reports group by **UTC week**, not local week.

---

## 🔧 User.timezone Field (Included in API Exports)

The database schema includes a `timezone` field on the `User` model:

```prisma
model User {
  // ...
  timezone String @default("UTC")
}
```

**Current Status:** Field is populated with IANA timezones (e.g., `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`) and is **included in Time Card API exports**.

**Usage:**
- ✅ **Time Card API:** User timezone is included in export responses for payroll integration
- ⚠️ **Internal Reports:** Not currently used for date range conversion or display
- ⚠️ **Frontend Display:** Browser timezone used instead of user preference

**Example Database Values:**
```sql
SELECT "firstName", "lastName", timezone FROM "User" LIMIT 5;

 firstName | lastName |      timezone
-----------+----------+---------------------
 James     | Smith    | Europe/Paris
 Mary      | Johnson  | Australia/Melbourne
 Robert    | Williams | America/Sao_Paulo
```

**API Export Format:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP-12345",
    "timezone": "America/New_York"
  }
}
```

**Future Enhancement Opportunity:**
- Could be used to convert report date ranges to user's local timezone
- Could adjust "week start" for weekly reports based on user location
- Could provide timezone-aware calendar date filtering in frontend
- Could override browser timezone for consistent cross-device experience

---

## 📋 Best Practices for Developers

### When Adding New Timestamp Fields

1. **Always use `DateTime` in Prisma schema** (maps to `timestamp without time zone`)
2. **Always use JavaScript `new Date()`** for current timestamp
3. **Always call `.toISOString()`** when sending to API or logging
4. **Never use string manipulation for dates** (use date-fns or similar)

### When Accepting Timestamps from Frontend

1. **Always expect ISO 8601 UTC strings** (`2025-11-24T09:35:00.000Z`)
2. **Use Zod `z.coerce.date()`** for validation
3. **Never assume timezone** - verify ISO string includes `Z` suffix

### When Displaying Timestamps to Users

1. **Always parse with `parseISO()` from date-fns**
2. **Let browser handle timezone conversion automatically**
3. **Use `format()` from date-fns for display formatting**

---

## 🧪 Testing Timezone Handling

### Verify API Returns UTC

```bash
curl "https://your-domain.com/api/timecard/export?startDate=2025-11-24&endDate=2025-11-30" \
  -H "Authorization: Bearer pmo_live_your_key" | jq '.[] .details[].sessions[0].startTime'

# Expected output: "2025-11-24T09:35:00.000Z" (note the Z suffix)
```

### Verify Database Stores UTC

```sql
-- Connect to PostgreSQL
SELECT "startTime", "endTime"
FROM "TimeEntrySession"
LIMIT 1;

-- Expected output:
--  startTime      |       endTime
-- ----------------+---------------------
--  2025-11-24 09:35:00 | 2025-11-24 11:56:00
-- (no timezone offset - stored as UTC because server is UTC)
```

### Verify Frontend Converts to Local Time

1. Open browser DevTools
2. Go to Time Tracking page
3. Inspect a time entry's startTime in the JavaScript console:
   ```javascript
   // API returns: "2025-11-24T09:35:00.000Z"
   const utcTime = "2025-11-24T09:35:00.000Z";
   const localDate = new Date(utcTime);
   console.log(localDate.toString());
   // Output depends on browser timezone:
   // PST: "Sun Nov 24 2025 01:35:00 GMT-0800"
   // GMT: "Sun Nov 24 2025 09:35:00 GMT+0000"
   // JST: "Sun Nov 24 2025 18:35:00 GMT+0900"
   ```

---

## 🚨 Potential Issues and Solutions

### Issue 1: PostgreSQL Server Timezone Changed

**Problem:** If PostgreSQL server timezone is changed from UTC to another timezone (e.g., EST), all existing timestamps become ambiguous.

**Impact:**
- Stored value `2025-11-24 09:35:00` was meant to be UTC
- But PostgreSQL now interprets it as EST
- All historical data becomes incorrect

**Solution:**
- **DO NOT change PostgreSQL server timezone**
- Add monitoring to alert if `SHOW TIMEZONE;` returns anything other than `UTC`
- Document in deployment guide that server MUST remain UTC

### Issue 2: Manual Database Edits

**Problem:** If someone manually inserts data without using the application (e.g., SQL scripts), they might insert timestamps in local timezone.

**Solution:**
- Always use `AT TIME ZONE 'UTC'` in manual SQL:
  ```sql
  INSERT INTO "TimeEntrySession" (startTime, endTime, ...)
  VALUES ('2025-11-24 09:35:00' AT TIME ZONE 'UTC', ...);
  ```

### Issue 3: Daylight Saving Time (DST)

**Problem:** UTC doesn't observe DST, but user's local timezone might.

**Impact:**
- During DST transitions, user's local time display shifts
- But stored UTC values remain correct
- This is **expected behavior** and not a bug

**Example:**
- Time entry stored as `2025-03-10T10:00:00.000Z` (UTC, before DST)
- User in PST sees `2:00 AM PST` (UTC-8)
- After DST switch to PDT (UTC-7), same timestamp shows as `3:00 AM PDT`
- **This is correct** - the absolute moment in time hasn't changed

### Issue 4: Date Boundary Mismatches

**Problem:** A user's local "Monday" might be Sunday in UTC.

**Current Behavior:**
- Weekly reports group by UTC week
- A user in Tokyo working Monday 1 AM JST is actually working Sunday 4 PM UTC
- This entry appears in the **previous week** for UTC-based reports

**Future Enhancement:**
- Use `User.timezone` field to generate reports in user's local week
- Requires updating report queries to apply timezone offset

---

## 📚 External API Documentation Updates

The TIME-CARD-API.md documentation should include a **Timezone Handling** section:

```markdown
## 🌍 Timezone Handling

All timestamps in API responses are in **UTC** using ISO 8601 format with `Z` suffix:
- `"startTime": "2025-11-24T09:35:00.000Z"` = 9:35 AM UTC

Query parameters use **calendar dates only** (YYYY-MM-DD):
- `startDate=2025-11-24` = Midnight UTC on Nov 24
- `endDate=2025-11-30` = 23:59:59.999 UTC on Nov 30

**Important for International Organizations:**
- Employees working in Tokyo (UTC+9) on Nov 24 local time are working Nov 23 UTC
- Adjust date ranges to account for timezone differences
- Example: To get all Nov 24 Tokyo time entries, query Nov 23-24 UTC range
```

---

## ✅ Recommendations

### Immediate Actions

1. ✅ **Document timezone behavior** (this document)
2. ✅ **Update TIME-CARD-API.md** with timezone section
3. ⚠️ **Add PostgreSQL timezone validation** to deployment scripts
4. ⚠️ **Add API response validation** to verify `Z` suffix exists

### Future Enhancements

1. **Implement User.timezone usage:**
   - Convert report date ranges to user's local timezone
   - Show "local week" vs "UTC week" toggle in reports
   - Display user's timezone in UI when viewing time entries

2. **Consider migrating to TIMESTAMPTZ:**
   - Change Prisma schema to use `@db.Timestamptz`
   - Run migration to alter column types
   - PostgreSQL will store and convert timezones natively
   - **Note:** This is a breaking change requiring careful migration

3. **Add timezone metadata to API responses:**
   ```json
   {
     "user": {
       "timezone": "America/Los_Angeles",
       "timezoneOffset": "-08:00"
     },
     "serverTimezone": "UTC",
     "timestamps": "All timestamps in UTC (ISO 8601)"
   }
   ```

---

## 📞 Support

For questions about timezone handling:
- Review this document
- Check TIME-CARD-API.md for external API specifics
- Consult deployment guide for PostgreSQL timezone configuration

---

**Last Updated:** November 2025
**Status:** Production-Ready (with documented limitations)
