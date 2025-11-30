# Administrator's Guide to Timezone Handling

> **Critical Information for PMO Platform Administrators**
> Understanding how timezones work in the system and what the settings mean.

---

## 🎯 Executive Summary for Admins

**THE MOST IMPORTANT THING TO UNDERSTAND:**

All time entries are **ALWAYS stored in UTC**, regardless of the user's timezone setting.

The `User.timezone` field is **METADATA ONLY** - it tells external systems which timezone the user works in, but **does NOT affect how their time is stored in the database**.

---

## ⚙️ Admin Settings: Default Timezone

**Location:** Admin → Platform Settings → Platform tab

**Setting:** `defaultTimezone` (currently set to `UTC`)

### What This Setting Does

When you create a new user, this setting determines their **initial timezone value**:
- If you don't specify a timezone when creating a user, they get `UTC`
- If you DO specify a timezone, it overrides this default

### What This Setting Does NOT Do

- ❌ Does NOT change how time entries are stored in the database
- ❌ Does NOT convert times when users log time
- ❌ Does NOT affect existing users
- ❌ Does NOT change the system's internal timezone handling

**Think of it as:** "What timezone label should new users get if I don't specify one?"

---

## 👤 User Timezone Field

**Location:** Admin → People → [Select User] → Edit

**Field:** `Timezone` (dropdown with IANA timezones like `America/New_York`, `Europe/London`, etc.)

### What This Field Does

1. **Metadata for External Systems:**
   - When you export time cards via the Time Card API, each user's timezone is included
   - Payroll systems (Workday, PeopleSoft) can see which timezone the employee works in
   - Helps external systems understand date boundaries for international teams

2. **User Profile Information:**
   - Stored in the database: `User.timezone`
   - Can be changed at any time
   - Visible in user profiles

### What This Field Does NOT Do

- ❌ Does NOT change how the user's time entries are stored
- ❌ Does NOT convert times when they start/stop timers
- ❌ Does NOT affect how times are displayed in the UI
- ❌ Does NOT recalculate existing time entries when changed

**Think of it as:** "Where does this employee physically work?" not "How should we store their time?"

---

## 🔍 How Time Storage Actually Works

### The Truth: Everything is UTC

**No matter what:**
- User in New York (UTC-5) starts timer at 3:00 PM EST
- User in Tokyo (UTC+9) starts timer at 9:00 AM JST
- User in London (UTC+0) starts timer at 8:00 PM GMT

**All three are stored as the same format: UTC timestamp**

### Example: James Smith in Paris

**User Profile:**
- Name: James Smith
- Timezone: `Europe/Paris` (UTC+1, or UTC+2 during DST)

**What Happens When He Logs Time:**

1. **James starts timer at 10:35 AM Paris time**
   - His browser converts: "10:35 AM Paris" → `2025-11-24T09:35:00.000Z` (UTC)
   - Frontend sends to backend: `2025-11-24T09:35:00.000Z`
   - Backend stores in database: `2025-11-24 09:35:00` (UTC)
   - His `timezone` field (`Europe/Paris`) is NOT used in this process

2. **James stops timer at 12:56 PM Paris time**
   - Browser converts: "12:56 PM Paris" → `2025-11-24T11:56:00.000Z` (UTC)
   - Database stores: `2025-11-24 11:56:00` (UTC)

3. **Database Contains:**
   ```sql
   User: James Smith, timezone: Europe/Paris
   TimeEntrySession:
     startTime: 2025-11-24 09:35:00  ← This is UTC time
     endTime:   2025-11-24 11:56:00  ← This is UTC time
   ```

4. **When Displayed in UI:**
   - Frontend reads: `2025-11-24T09:35:00.000Z`
   - James's browser (set to Paris timezone) shows: "10:35 AM"
   - A manager in New York sees: "4:35 AM"
   - A colleague in Tokyo sees: "6:35 PM"
   - **All viewing the SAME database record, converted to their browser timezone**

### The Critical Point

If you change James's timezone from `Europe/Paris` to `America/New_York`:
- ✅ Future API exports will show his timezone as `America/New_York`
- ❌ His existing time entries do NOT change
- ❌ The stored UTC times remain the same
- ❌ No recalculation happens

The stored time `2025-11-24 09:35:00` will still be interpreted as 09:35 UTC, regardless of his current timezone setting.

---

## 🌍 Why This Matters for International Teams

### Scenario: Multi-Timezone Organization

Your company has:
- **New York office** (UTC-5)
- **London office** (UTC+0)
- **Bangalore office** (UTC+5:30)

**Monday, November 24, 2025:**

**Employee A (New York, UTC-5):**
- Works 9:00 AM - 5:00 PM EST
- Stored as: `2025-11-24 14:00:00` to `2025-11-24 22:00:00` (UTC)
- Date in database: `2025-11-24`

**Employee B (Bangalore, UTC+5:30):**
- Works 9:00 AM - 5:00 PM IST (India Standard Time)
- Stored as: `2025-11-24 03:30:00` to `2025-11-24 11:30:00` (UTC)
- Date in database: `2025-11-24`

**Employee C (Bangalore, working late):**
- Works 8:00 PM - 11:00 PM IST (same Monday local time)
- Stored as: `2025-11-24 14:30:00` to `2025-11-24 17:30:00` (UTC)
- Date in database: `2025-11-24`

### All Three Show "Monday Nov 24" Locally

But when you query the database for `date = 2025-11-24`, you get:
- Employee A: 8 hours (2 PM UTC - 10 PM UTC)
- Employee B: 8 hours (3:30 AM UTC - 11:30 AM UTC)
- Employee C: 3 hours (2:30 PM UTC - 5:30 PM UTC)

**This is correct!** All are working on their local "Monday Nov 24" but at different absolute times.

---

## 📊 Time Card API Export Behavior

### What Gets Exported

When external payroll systems call `/api/timecard/export?startDate=2025-11-24&endDate=2025-11-24`:

```json
[
  {
    "user": {
      "firstName": "James",
      "lastName": "Smith",
      "employeeId": "EMP-001",
      "timezone": "Europe/Paris"  ← Tells payroll system where he works
    },
    "details": [{
      "date": "2025-11-24",  ← UTC calendar date
      "sessions": [{
        "startTime": "2025-11-24T09:35:00.000Z",  ← UTC timestamp
        "endTime": "2025-11-24T11:56:00.000Z",    ← UTC timestamp
        "duration": 2.35
      }]
    }]
  }
]
```

**The payroll system must:**
1. See `timezone: "Europe/Paris"`
2. Convert `09:35 UTC` → `10:35 Paris time`
3. Understand that his "work day" might span two UTC dates

---

## ⚠️ Common Misconceptions

### ❌ WRONG: "If I set a user's timezone to Tokyo, their times will be stored in Tokyo time"

**NO!** All times are stored in UTC. The timezone field is just a label.

### ❌ WRONG: "If I change a user's timezone, it will fix their past time entries"

**NO!** Changing the timezone field only affects future API exports. Historical data remains unchanged.

### ❌ WRONG: "The default timezone setting controls the database timezone"

**NO!** PostgreSQL server runs in UTC always. The default timezone setting only affects new user profiles.

### ❌ WRONG: "Users see times in the timezone from their profile"

**NO!** Users see times converted to their **browser's timezone**, not their profile timezone field.

### ✅ CORRECT: "The timezone field tells external systems where the employee works"

**YES!** It's metadata for payroll integration, not a storage or display setting.

---

## 🛠️ Best Practices for Admins

### 1. Set User Timezones Accurately

When creating or editing users, set their timezone to match where they physically work:
- Remote employee in California → `America/Los_Angeles`
- Office worker in London → `Europe/London`
- Contractor in Australia → `Australia/Sydney`

This helps external payroll systems understand date boundaries.

### 2. Don't Change Timezones Unless Employee Relocates

If an employee moves from New York to London:
- ✅ Update their timezone to `Europe/London`
- ✅ Understand that past time entries remain as UTC (correct)
- ✅ Future API exports will show new timezone

### 3. Explain to Users: Browser Timezone Matters

Users see times in their **browser's timezone**, not their profile setting:
- If a user travels, times displayed will shift automatically
- If they use a VPN, browser timezone might be affected
- This is normal and expected

### 4. For International Teams: Plan Reporting Accordingly

When running reports:
- Weekly reports group by UTC week (may differ from local week)
- Daily reports show UTC calendar dates
- Consider using wider date ranges for multi-timezone queries

### 5. Time Card API: Educate Payroll Integration Team

Make sure your payroll team understands:
- All timestamps are UTC (look for `Z` suffix)
- Query parameters are UTC calendar dates
- User timezone field helps determine date range offsets
- They must convert UTC → local time for each employee

---

## 🔧 Technical Details (For Advanced Admins)

### Database Schema

```sql
-- PostgreSQL server timezone
SHOW TIMEZONE;  -- Result: UTC

-- TimeEntrySession table
CREATE TABLE "TimeEntrySession" (
  startTime   timestamp(3) without time zone  -- No timezone metadata stored
  endTime     timestamp(3) without time zone  -- Times stored as-is in UTC
);

-- User table
CREATE TABLE "User" (
  timezone    text DEFAULT 'UTC'  -- Metadata only
);
```

### Backend Behavior

```typescript
// When user starts timer (backend code)
const active = await db.activeTimeEntry.create({
  data: {
    startTime: new Date(),  // Creates Date in UTC
    // User.timezone is NOT consulted here
  }
});
```

### Frontend Behavior

```typescript
// When displaying time to user (frontend code)
const utcTime = "2025-11-24T09:35:00.000Z";  // From API
const localDate = new Date(utcTime);         // Converts to browser timezone
console.log(localDate.toString());
// New York browser: "Sun Nov 24 2025 04:35:00 GMT-0500"
// Paris browser:    "Sun Nov 24 2025 10:35:00 GMT+0100"
```

---

## 📞 When to Contact Support

You should reach out if:
- Time entries appear to be in the wrong timezone (they shouldn't be - all are UTC)
- You need to bulk-update user timezones
- External payroll integration is misinterpreting timestamps
- You suspect data corruption

You do NOT need support for:
- "User traveled and times look different" (browser timezone changed - normal)
- "Changing user timezone didn't fix past entries" (not supposed to - by design)
- "Times in database don't match user's local time" (correct - they're UTC)

---

## 📚 Related Documentation

- **TIME-CARD-API.md** - For external payroll integrations
- **TIMEZONE-HANDLING.md** - Deep technical dive into system architecture
- **User Guide** - How end-users should log time

---

**Last Updated:** November 2025
**Applies To:** PMO Platform v1.0+
