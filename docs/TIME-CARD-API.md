# Time Card API Documentation

> **External Payroll Integration API**
> Export time card data for integration with Workday, PeopleSoft, and other payroll systems.

---

## 🚀 Quick Start

### Step 1: Generate API Key

1. Navigate to **Admin** → **Platform Settings** → **Platform** tab
2. Click **"Manage API Keys"**
3. Enter a description (e.g., "Workday Integration")
4. Click **"Create API Key"**
5. **Copy the key immediately** - you won't see it again!

### Step 2: Configure Your Integration

Use the following base URL for all API requests:

```
https://your-domain.com/api/timecard
```

---

## 🔐 Authentication

All API requests must include the API key in the `Authorization` header:

```
Authorization: Bearer pmo_live_[your_api_key_here]
```

### Example Request with Authentication

```bash
curl -X GET "https://your-domain.com/api/timecard/export?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer pmo_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
```

> **💡 Tip:** API key format is always `pmo_live_` followed by 40 random hexadecimal characters.

---

## 📡 API Endpoints

### Export Time Cards

**GET** `/api/timecard/export`

Export time card data for all users within a date range.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date in `YYYY-MM-DD` format (inclusive) |
| `endDate` | string | Yes | End date in `YYYY-MM-DD` format (inclusive) |

#### Request Example

```http
GET /api/timecard/export?startDate=2025-01-01&endDate=2025-01-31
Host: your-domain.com
Authorization: Bearer pmo_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

#### Response Format

The API returns a JSON array containing time card data for each user who has time entries in the specified date range.

```json
[
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "employeeId": "EMP-12345"
    },
    "summary": [
      {
        "date": "2025-01-15",
        "totalHours": 8.5,
        "billableHours": 7.0
      }
    ],
    "details": [
      {
        "date": "2025-01-15",
        "sessions": [
          {
            "client": {
              "id": "uuid",
              "name": "Acme Corp",
              "salesforceAccountId": "SF-12345"
            },
            "project": {
              "id": "uuid",
              "name": "Website Redesign",
              "code": "WEB-001"
            },
            "task": {
              "id": "uuid",
              "title": "Build homepage"
            },
            "startTime": "2025-01-15T09:00:00.000Z",
            "endTime": "2025-01-15T12:00:00.000Z",
            "duration": 3.0,
            "isBillable": true,
            "description": "Implemented responsive design"
          }
        ]
      }
    ]
  }
]
```

#### Response Fields

**User Object:**
- `id` - Internal user ID (UUID)
- `email` - User's email address
- `firstName` - User's first name
- `lastName` - User's last name
- `employeeId` - Employee ID for payroll matching (nullable)

**Summary Array:**
- `date` - Date in ISO format (YYYY-MM-DD)
- `totalHours` - Total hours worked on this date (decimal)
- `billableHours` - Total billable hours on this date (decimal)

**Details Array:**
- `date` - Date in ISO format
- `sessions[]` - Array of work sessions for this date
  - `client` - Client information (can be null for non-client work)
  - `project` - Project information (can be null)
  - `task` - Task information (can be null)
  - `startTime` - Session start time (ISO 8601 UTC)
  - `endTime` - Session end time (ISO 8601 UTC)
  - `duration` - Session duration in hours (decimal)
  - `isBillable` - Whether this session is billable
  - `description` - Session description (nullable)

#### Error Responses

**401 Unauthorized** - Missing or invalid API key
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is invalid or has been revoked"
}
```

**400 Bad Request** - Invalid date format or parameters
```json
{
  "error": "Invalid query parameters",
  "details": [...]
}
```

**500 Internal Server Error** - Server error
```json
{
  "error": "Internal server error",
  "message": "Failed to export time card data"
}
```

---

## 💻 Code Examples

### Python Example

```python
import requests
from datetime import datetime, timedelta

# Configuration
API_KEY = 'pmo_live_your_api_key_here'
BASE_URL = 'https://your-domain.com/api/timecard'

# Calculate date range (last 30 days)
end_date = datetime.now()
start_date = end_date - timedelta(days=30)

# Make request
headers = {
    'Authorization': f'Bearer {API_KEY}'
}

params = {
    'startDate': start_date.strftime('%Y-%m-%d'),
    'endDate': end_date.strftime('%Y-%m-%d')
}

response = requests.get(f'{BASE_URL}/export', headers=headers, params=params)

if response.status_code == 200:
    time_cards = response.json()
    print(f"Retrieved time cards for {len(time_cards)} users")

    for user_card in time_cards:
        user = user_card['user']
        summary = user_card['summary']
        total_hours = sum(day['totalHours'] for day in summary)

        print(f"{user['firstName']} {user['lastName']}: {total_hours} total hours")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

### JavaScript (Node.js) Example

```javascript
const axios = require('axios');

const API_KEY = 'pmo_live_your_api_key_here';
const BASE_URL = 'https://your-domain.com/api/timecard';

async function exportTimeCards(startDate, endDate) {
  try {
    const response = await axios.get(`${BASE_URL}/export`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      params: {
        startDate,
        endDate
      }
    });

    const timeCards = response.data;
    console.log(`Retrieved ${timeCards.length} user time cards`);

    // Process time cards
    timeCards.forEach(userCard => {
      const { user, summary } = userCard;
      const totalHours = summary.reduce((sum, day) => sum + day.totalHours, 0);
      console.log(`${user.firstName} ${user.lastName}: ${totalHours} hours`);
    });

    return timeCards;
  } catch (error) {
    console.error('Error fetching time cards:', error.response?.data || error.message);
    throw error;
  }
}

// Export time cards for January 2025
exportTimeCards('2025-01-01', '2025-01-31');
```

### cURL Example

```bash
# Export time cards for January 2025
curl -X GET \
  "https://your-domain.com/api/timecard/export?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer pmo_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0" \
  | jq '.'

# Export time cards for a single day
curl -X GET \
  "https://your-domain.com/api/timecard/export?startDate=2025-01-15&endDate=2025-01-15" \
  -H "Authorization: Bearer pmo_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0" \
  | jq '.'
```

---

## ✅ Best Practices

### Security

- Store API keys securely using environment variables or secret management systems
- Never commit API keys to version control
- Use HTTPS for all API requests
- Rotate API keys periodically
- Monitor API key usage through audit logs

### Performance

- Limit date ranges to reasonable periods (e.g., monthly exports)
- Implement retry logic with exponential backoff for failed requests
- Cache responses when appropriate to reduce API calls
- Schedule exports during off-peak hours

### Data Processing

- Validate response data before importing into your payroll system
- Handle null values appropriately (client, project, task can be null)
- Use the `employeeId` field to match users to your payroll records
- Cross-reference `salesforceAccountId` if using Salesforce integration
- Store raw API responses for audit purposes

---

## 🔄 API Key Management

### Create a New API Key

1. Go to Admin → Platform Settings → Platform tab
2. Click "Manage API Keys"
3. Enter a description and click "Create API Key"
4. **Copy the key immediately** - it will only be shown once

### Regenerate an API Key

⚠️ **Warning:** The old key will stop working immediately after regeneration.

1. Go to Admin → Platform Settings → Platform tab
2. Click "Manage API Keys"
3. Click "Regenerate Key"
4. Confirm the action
5. Copy the new key and update your integration

### Revoke an API Key

⚠️ **Warning:** This will immediately stop all external integrations using this key.

1. Go to Admin → Platform Settings → Platform tab
2. Click "Manage API Keys"
3. Click "Revoke Key"
4. Confirm the action

### Security Notice

- Only one API key can exist at a time
- API keys are hashed with SHA-256 before storage
- Keys are shown only once upon creation/regeneration
- All API requests are logged for security auditing

---

## 🛠️ Troubleshooting

### "Invalid or expired token" Error

**Cause:** Using JWT token instead of API key, or API key is invalid.

**Solution:**
- Ensure you're using the API key (starts with `pmo_live_`)
- Verify the key hasn't been regenerated or revoked
- Check that the Authorization header format is correct: `Bearer pmo_live_...`

### "Invalid date format" Error

**Cause:** Dates not in YYYY-MM-DD format.

**Solution:**
- Use ISO date format: `2025-01-15`
- Ensure dates are strings, not Date objects
- Example: `?startDate=2025-01-01&endDate=2025-01-31`

### Empty Array Response `[]`

**Cause:** No time entries exist for the specified date range.

**Solution:**
- Verify users have logged time entries in the date range
- Check that time entries are not soft-deleted
- Try a different date range

### "Route not found" Error

**Cause:** Incorrect API endpoint URL.

**Solution:**
- Use `/api/timecard/export` (NOT `/api/admin/timecard/api-key`)
- Include query parameters: `?startDate=...&endDate=...`
- Full URL: `https://your-domain.com/api/timecard/export?startDate=2025-01-01&endDate=2025-01-31`

---

## 📞 Support

For API support, contact your PMO Platform administrator or reach out to:

- **Email:** support@your-domain.com
- **Documentation:** https://github.com/dtsoden/pmo/tree/main/docs

---

**PMO Platform Time Card API v1.0** • Last updated November 2025
