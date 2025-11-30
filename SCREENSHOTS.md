# Screenshot Guide for Landing Page

This guide tells you exactly what screenshots to capture for the **auto-playing carousel** on the landing page.

## What Changed

The landing page now features an **auto-playing image carousel** that cycles through 5 analytics screenshots every 3 seconds. Users can also manually navigate with arrow buttons or dot indicators.

## Setup Before Taking Screenshots

1. **Login** to the PMO Platform at https://pmoplatform.com (or http://localhost:7620)
2. **Use a clean browser window** - hide bookmarks bar, extensions, etc. for professional screenshots
3. **Set browser to 1920x1080 resolution** (full HD) for consistent sizing
4. **Use light mode** for screenshots (better for marketing materials)

## Screenshot Locations

Save all screenshots to: `frontend/static/screenshots/`

All images should be named: `analytics-dashboard.png`, `analytics-dashboard-2.png`, `analytics-dashboard-3.png`, etc.

---

## Carousel Screenshots (5 Required)

### Screenshot #1: Executive Analytics Dashboard - Overview
**File name:** `analytics-dashboard.png`

**Where to navigate:**
1. Go to `/analytics` (Analytics page in main navigation)
2. Scroll to the top to show the full dashboard

**What to capture:**
- **Financial KPIs** section (top row):
  - Billable Revenue
  - Non-Billable Opportunity
  - Billability Rate
  - Average Team Utilization
- **Project Portfolio Health** donut chart (left)
- **Team Capacity Health** visual bars (right)
- **High-Priority Projects Alert** box (if visible)

**Tips:**
- Capture the top half of the analytics page
- Make sure all KPI numbers are visible and clear
- Show the donut chart with colored segments
- Capture the gradient colors in Team Capacity Health

---

### Screenshot #2: Burnout Risk Modal
**File name:** `analytics-dashboard-2.png`

**Where to navigate:**
1. Go to `/analytics`
2. Scroll to "Team Capacity Health" section
3. **Click the red "Burnout Risk" alert** (only visible if you have over-allocated team members >100%)

**What to capture:**
- The entire modal dialog showing:
  - Modal title: "Burnout Risk - Workload Redistribution Needed"
  - Over-allocated team members with:
    - Name, department, utilization % (>100%, shown in red)
    - Hours logged vs available
  - **"Recommended: Redistribute to Team Members with Capacity"** section:
    - Team members who can help
    - Their utilization %, available hours
    - Skills badges
    - "Same Department" badge if applicable
  - **"Consider Hiring: Critical Skill Gaps"** section (if applicable)

**Tips:**
- Make sure modal is fully visible with darkened background
- Show multiple redistribution candidates if possible
- Capture green "available hours" indicators
- Show skill badges in different colors

---

### Screenshot #3: Skills Gap Analysis
**File name:** `analytics-dashboard-3.png`

**Where to navigate:**
1. Go to `/analytics`
2. Scroll down to **"Talent Optimization"** section

**What to capture:**
- The entire "Talent Optimization" card showing BOTH panels:
  - **Left panel:** "Skills Development Opportunities (40-65% utilization)"
    - 2-3 team members with name, utilization %
    - "Recommended Skills" with color-coded badges (CRITICAL, HIGH, MEDIUM)
    - "Action" box with project recommendations
  - **Right panel:** "Resource Optimization Review (<40% utilization)"
    - Bench candidates with current skills
    - Recommended training with severity badges
    - Strategic options (training, reassignment, bench release)

**Tips:**
- Show pagination controls ("Showing 1-5 of 12")
- Capture color-coded skill badges (red = CRITICAL, amber = HIGH)
- Show "Monthly Cost Impact" summary at bottom
- May need to scroll to fit both panels

---

### Screenshot #4: Team Capacity Health Expanded
**File name:** `analytics-dashboard-4.png`

**Where to navigate:**
1. Go to `/analytics`
2. Focus on the **Team Capacity Health** section with visual bars

**What to capture:**
- The complete Team Capacity Health card showing:
  - Title "Team Capacity Health" with active member count
  - Utilization distribution bars:
    - Green: Optimal (80-100%)
    - Red: Over-Allocated (>100%)
    - Gray: Under-Utilized (<50%)
  - Person counts for each category
  - Both clickable alerts:
    - Red "Burnout Risk" alert
    - Amber/Yellow "Available Capacity" alert
  - Brief descriptions of what each alert means

**Tips:**
- Make sure the gradient bars are clearly visible
- Show the alert boxes as clickable (with arrow icons)
- Capture the member counts for each utilization category

---

### Screenshot #5: Department Performance & Top Contributors
**File name:** `analytics-dashboard-5.png`

**Where to navigate:**
1. Go to `/analytics`
2. Scroll to the bottom sections

**What to capture:**
- **Top Contributors** leaderboard (left):
  - Top 5 team members by hours logged
  - Names, hours, utilization bars
  - Colored utilization indicators
- **Department Performance** table (right):
  - Multiple departments listed
  - Utilization percentages by department
  - Color-coded cells (red for over-allocated, green for optimal)

**Tips:**
- Show both cards side-by-side
- Capture the utilization bars next to each contributor's name
- Show variety in department utilization (some red, some green)
- Make sure all numbers are legible

---

## After Taking Screenshots

1. **Verify all 5 files exist:**
   ```
   frontend/static/screenshots/
   ├── analytics-dashboard.png
   ├── analytics-dashboard-2.png
   ├── analytics-dashboard-3.png
   ├── analytics-dashboard-4.png
   └── analytics-dashboard-5.png
   ```

2. **Verify file names match exactly** (case-sensitive!)

3. **For production deployment:**
   - Commit and push the screenshots to git
   - Rebuild the Docker containers to include the new images
   - See DEPLOYMENT.md for rebuild instructions

4. **For local development:**
   - The landing page carousel will automatically load the images on refresh
   - Use `Ctrl + Shift + R` for hard refresh to clear cache

5. **Optional: Compress images for web**
   - Use tinypng.com or similar
   - Aim for under 500KB per image
   - Maintain good quality (80-90%)

---

## How the Carousel Works

- **Auto-play:** Cycles through all 5 images every 3 seconds
- **Hover to pause:** Auto-play pauses when user hovers over carousel
- **Manual navigation:**
  - Previous/Next arrow buttons on left/right
  - Dot indicators at bottom (click to jump to specific image)
- **Image counter:** Shows "1/5", "2/5", etc. in top-right corner

---

## Troubleshooting

**"I don't see the Burnout Risk alert"**
- You need over-allocated team members (>100% utilization)
- Go to `/people` and check if anyone shows >100%
- Test data may need adjustment

**"The modal doesn't have hiring recommendations"**
- Only shows if critical skill gaps exist where <3 people have the skill
- It's okay if this section doesn't appear

**"Screenshots look blurry"**
- Ensure browser is at 100% zoom (not zoomed in/out)
- Use a retina/high-DPI display if possible
- Save as PNG (not JPG) for crisp text

**"Images show as broken on production (pmoplatform.com)"**
- The Docker container needs to be rebuilt to include new images
- Push screenshots to git, then trigger a new deployment
- See instructions below

---

## Production Deployment (Azure Container Apps)

After adding/updating screenshots:

1. **Commit and push to git:**
   ```bash
   git add frontend/static/screenshots/*.png
   git commit -m "Update carousel screenshots"
   git push
   ```

2. **Rebuild Docker containers:**

   **Option A: Manual rebuild**
   ```bash
   # From project root
   cd frontend
   docker build -t pmo-frontend:latest .
   docker push <your-registry>/pmo-frontend:latest
   ```

   **Option B: Azure Container Apps**
   - Go to Azure Portal
   - Find your Container App for the frontend
   - Click "Revision Management" → "Create new revision"
   - This will rebuild from latest git commit

3. **Verify deployment:**
   - Visit https://pmoplatform.com
   - Hard refresh browser (`Ctrl + Shift + R`)
   - Carousel should show all 5 images

---

## Example Screenshot Sizes

Target dimensions (approximate):
- **#1 Analytics Dashboard Overview:** 1920x1080px (standard viewport)
- **#2 Burnout Modal:** 1920x1080px (full screen with modal)
- **#3 Skills Gap Analysis:** 1920x900px (Talent Optimization section)
- **#4 Team Capacity Health:** 1920x800px (focused on capacity bars)
- **#5 Department Performance:** 1920x800px (bottom section with tables)

All images are automatically sized to fit 16:9 aspect ratio in the carousel (responsive).
