# Complete Screenshot Guide for Landing Page

This guide covers **ALL** screenshots needed for the landing page - both the carousel and individual feature sections.

**Total screenshots needed:** 10 (5 for carousel + 5 for feature sections)

---

## 📁 Where to Save All Screenshots

Save ALL screenshots to: `frontend/static/screenshots/`

---

## 🎯 Section 1: Carousel Screenshots (5 images)

The carousel auto-plays through 5 analytics screenshots. These go in the "Actionable Intelligence, Not Just Dashboards" section.

### Screenshot 1: Executive Analytics Dashboard Overview
**File name:** `analytics-dashboard.png`

**Where to navigate:**
- Go to `/analytics` page

**What to capture:**
- Full top section showing:
  - Financial KPIs (Billable Revenue, Non-Billable Opportunity, Billability Rate, Team Utilization)
  - Project Portfolio Health donut chart
  - Team Capacity Health bars
  - High-Priority Projects alert (if visible)

**Tips:** Capture the entire top half of the analytics page

---

### Screenshot 2: Burnout Risk Modal
**File name:** `analytics-dashboard-2.png`

**Where to navigate:**
- Go to `/analytics`
- Click the red **"Burnout Risk"** alert in Team Capacity Health section

**What to capture:**
- The modal showing:
  - Over-allocated team members (>100% utilization)
  - WHO can help with available hours and skills
  - Hiring recommendations for critical skills

**Tips:** Show the full modal with darkened background

---

### Screenshot 3: Skills Gap Analysis
**File name:** `analytics-dashboard-3.png`

**Where to navigate:**
- Go to `/analytics`
- Scroll to **"Talent Optimization"** section at bottom

**What to capture:**
- Both panels:
  - Left: Skills Development Opportunities (40-65% utilization)
  - Right: Resource Optimization Review (<40% utilization)
  - Color-coded skill badges (CRITICAL, HIGH, MEDIUM)

**Tips:** Capture the full Talent Optimization card with both panels

---

### Screenshot 4: Team Capacity Health Expanded
**File name:** `analytics-dashboard-4.png`

**Where to navigate:**
- Go to `/analytics`
- Focus on **Team Capacity Health** section

**What to capture:**
- Team Capacity Health card showing:
  - Utilization distribution bars (Optimal, Over-Allocated, Under-Utilized)
  - Member counts for each category
  - Both clickable alerts (Burnout Risk + Available Capacity)

**Tips:** Show the gradient bars and alert boxes clearly

---

### Screenshot 5: Department Performance & Top Contributors
**File name:** `analytics-dashboard-5.png`

**Where to navigate:**
- Go to `/analytics`
- Scroll to bottom sections

**What to capture:**
- Side-by-side view:
  - Top Contributors leaderboard (left)
  - Department Performance table (right)
  - Color-coded utilization indicators

**Tips:** Capture both cards together, show variety in colors

---

## 🎯 Section 2: Feature Screenshots (5 images)

Individual screenshots for each major feature section on the landing page.

### Screenshot 6: Chrome Extension Time Tracking
**File name:** `time-tracking.png`

**Where to navigate:**
- Open the **Chrome Extension** (if installed) OR
- Go to `/time` (Time Tracking page in main navigation)

**What to capture (choose one):**

**Option A - Chrome Extension (preferred):**
- Screenshot of the extension popup showing:
  - Active timer running
  - Task name and project
  - Elapsed time
  - Start/Stop button
  - Recent shortcuts list

**Option B - Web App Timer:**
- Go to `/time` or `/dashboard`
- Show the active timer widget with:
  - Running timer
  - Task details
  - Start/Stop/Pause controls
  - Billable/Non-billable toggle

**Tips:**
- Show timer actively running (not stopped)
- If using extension, capture the popup with a clean background
- Recommended size: 1920x1080px

---

### Screenshot 7: Automated Task Shortcuts
**File name:** `task-shortcuts.png`

**Where to navigate:**
- Open the **Chrome Extension** OR
- Go to `/time` page in the web app

**What to capture (choose one):**

**Option A - Chrome Extension (preferred):**
- Extension popup showing:
  - List of task shortcuts
  - Searchable dropdown
  - Multiple tasks from different projects
  - Quick start buttons for each task

**Option B - Web App:**
- Go to `/time`
- Show:
  - Task selection dropdown
  - Recent tasks list
  - Project grouping

**Tips:**
- Show at least 3-5 tasks in the list
- Highlight the searchable/filterable aspect
- Recommended size: 1920x1080px

---

### Screenshot 8: Visual Capacity Planning
**File name:** `capacity-planning.png`

**Where to navigate:**
- Go to `/capacity` (Capacity page in main navigation)

**What to capture:**
- **Team Utilization** section showing:
  - Filter buttons (Critical, Low, Moderate, Optimal, Over-allocated)
  - Color gradient KEY legend
  - Multiple team members with colored utilization boxes
  - Names, departments, hours logged/available, utilization %
  - Pagination controls
  - Summary totals (total hours, average utilization)

**Tips:**
- Show variety of colors (orange, yellow, blue, green, red)
- Capture the gradient visualization clearly
- Show at least 8-10 team members
- Recommended size: 1920x1080px

---

### Screenshot 9: Complete Project Management
**File name:** `project-management.png`

**Where to navigate:**
- Go to `/projects` and click into a specific project OR
- Go to a project detail page showing full hierarchy

**What to capture:**
- Project detail view showing:
  - Project header (name, client, status, budget)
  - **Phases** listed or expandable
  - **Milestones** under phases
  - **Tasks** under milestones
  - Task dependencies (if visible)
  - Budget tracking
  - Team assignments
  - Status indicators

**Tips:**
- Show a project with multiple phases and tasks
- Highlight the hierarchy: Project → Phase → Milestone → Task
- Show some completed and in-progress items
- Recommended size: 1920x1080px

---

### Screenshot 10: Client Management
**File name:** `client-management.png`

**Where to navigate:**
- Go to `/clients` and click into a specific client detail page

**What to capture:**
- Client detail view showing:
  - Client header (name, status, industry)
  - **Contacts** section
  - **Opportunities** pipeline
  - **Active Projects** linked to client
  - Contact information
  - Status indicators
  - Opportunity stages (New, Qualified, Proposal, etc.)

**Tips:**
- Show a client with at least 2-3 contacts
- Show at least 1-2 opportunities in different stages
- Show linked projects if available
- Recommended size: 1920x1080px

---

## ✅ Complete File List

After taking all screenshots, you should have these 10 files in `frontend/static/screenshots/`:

```
frontend/static/screenshots/
├── analytics-dashboard.png          # Carousel #1
├── analytics-dashboard-2.png        # Carousel #2
├── analytics-dashboard-3.png        # Carousel #3
├── analytics-dashboard-4.png        # Carousel #4
├── analytics-dashboard-5.png        # Carousel #5
├── time-tracking.png                # Feature #1
├── task-shortcuts.png               # Feature #2
├── capacity-planning.png            # Feature #4
├── project-management.png           # Feature #5
└── client-management.png            # Feature #6
```

**Note:** Feature #3 (Executive Analytics) uses the carousel, so no separate image needed.

---

## 🔄 After Taking Screenshots

1. **Verify all 10 files exist** with correct names (case-sensitive!)

2. **For local development:**
   ```bash
   # Hard refresh browser to clear cache
   Ctrl + Shift + R
   ```

3. **For production deployment:**
   ```bash
   git add frontend/static/screenshots/*.png
   git commit -m "Add all landing page screenshots"
   git push
   ```
   Then rebuild Azure Container App (see main SCREENSHOTS.md)

4. **Optional: Compress images**
   - Use tinypng.com
   - Aim for under 500KB each
   - Maintain 80-90% quality

---

## 📐 Screenshot Sizes

All screenshots should be approximately **1920x1080px** (full HD) for consistency:

- Use 100% browser zoom (not zoomed in/out)
- Hide browser bookmarks bar and extensions
- Use light mode for all screenshots
- Save as PNG (not JPG) for crisp text

---

## ❓ Troubleshooting

**"I don't have the Chrome extension installed"**
- For screenshots #6 and #7, use the web app alternatives described above
- The web app shows the same functionality

**"I can't find a project with phases and tasks"**
- Create a test project with at least 2 phases and 4-5 tasks
- Or use any existing project that has multiple tasks

**"Client page doesn't show opportunities"**
- Add a test opportunity to any client
- Go to client detail → click "Add Opportunity"

**"Images are broken on production"**
- Make sure you committed and pushed the screenshots to git
- Rebuild the Docker container in Azure Portal
- Hard refresh browser after deployment

---

## 🎨 Visual Guide

**Carousel sections** (analytics-dashboard-*.png):
- All from `/analytics` page
- Showcase clickable intelligence and data visualization

**Feature sections** (individual features):
- time-tracking.png → Shows timer in action
- task-shortcuts.png → Shows automated shortcuts
- capacity-planning.png → Shows gradient color visualization
- project-management.png → Shows project hierarchy
- client-management.png → Shows CRM functionality

Each screenshot should clearly demonstrate the feature's value proposition described in the landing page text.
