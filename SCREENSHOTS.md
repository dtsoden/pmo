# Screenshot Guide for Landing Page

This guide tells you exactly what screenshots to capture for the landing page placeholders.

## Setup Before Taking Screenshots

1. **Login** to the PMO Platform at https://pmoplatform.com (or http://localhost:7620)
2. **Use a clean browser window** - hide bookmarks bar, extensions, etc. for professional screenshots
3. **Set browser to 1920x1080 resolution** (full HD) for consistent sizing
4. **Use light mode** for screenshots (better for marketing materials)

## Screenshot Locations

Save all screenshots to: `frontend/static/screenshots/`

Create the folder if it doesn't exist:
```bash
mkdir frontend/static/screenshots
```

---

## Screenshot #1: Executive Analytics Dashboard

**File name:** `analytics-dashboard.png`

**Where to navigate:**
1. Go to `/analytics` (Analytics page in the main navigation)
2. Scroll to the top

**What to capture:**
- Full page screenshot showing:
  - **Financial KPIs** section (top):
    - Billable Revenue
    - Non-Billable Opportunity
    - Billability Rate
    - Team Utilization
  - **Project Portfolio Health** donut chart
  - **Team Capacity Health** with the visual bars
  - **Top 5 Contributors** leaderboard
  - **Department Performance** table

**Tips:**
- Make sure all numbers are visible and clear
- Capture the gradient colors in the Team Capacity Health section
- Show the donut chart with multiple colored segments

**Screenshot type:** Full viewport (use browser's screenshot tool or Cmd/Ctrl + Shift + S in Firefox)

---

## Screenshot #2: Burnout Risk Modal

**File name:** `burnout-risk-modal.png`

**Where to navigate:**
1. Go to `/analytics`
2. Scroll to "Team Capacity Health" section
3. **Click the red "Burnout Risk" alert box** (only visible if you have over-allocated team members)

**What to capture:**
- The entire modal dialog showing:
  - Modal title: "Burnout Risk - Workload Redistribution Needed"
  - At least one over-allocated team member with:
    - Name and department
    - Utilization percentage (>100%, shown in red)
    - Hours logged vs available
  - **"Recommended: Redistribute to Team Members with Capacity"** section showing:
    - Team members who can help
    - Their utilization percentage
    - Available hours
    - Skills badges
    - "Same Department" badge if applicable
  - **"Consider Hiring: Critical Skill Gaps"** section (if applicable) showing:
    - Skills in high demand
    - Severity badges (CRITICAL/HIGH)

**Tips:**
- Make sure the modal is fully visible with the background slightly darkened
- Show multiple redistribution candidates if possible
- Capture the green "available hours" indicators
- Show skill badges in different colors

**Screenshot type:** Full screen with modal open

---

## Screenshot #3: Skills Gap Analysis

**File name:** `skills-gap-analysis.png`

**Where to navigate:**
1. Go to `/analytics`
2. Scroll down to **"Talent Optimization"** section at the bottom

**What to capture:**
- The entire "Talent Optimization" card showing BOTH panels:
  - **Left panel:** "Skills Development Opportunities (40-65% utilization)"
    - Show 2-3 team members with:
      - Name and utilization percentage
      - "Recommended Skills" with color-coded badges (red, amber, blue)
      - "Action" box with specific project recommendations
  - **Right panel:** "Resource Optimization Review (<40% utilization)"
    - Show at least 1-2 bench candidates with:
      - Current skills
      - Recommended training with severity badges
      - Strategic options (training, reassignment, bench release)

**Tips:**
- Capture the pagination controls showing "Showing 1-5 of 12" if present
- Show the color-coded skill badges (CRITICAL = red, HIGH = amber)
- Make sure the "12 candidates" and "1 flagged" badges are visible at the top
- Show the financial impact summary at the bottom ("Monthly Cost Impact")

**Screenshot type:** Full section (you may need to scroll to fit both panels)

---

## Screenshot #4: Visual Capacity Planning

**File name:** `capacity-planning.png`

**Where to navigate:**
1. Go to `/capacity` (Capacity page in the main navigation)
2. Stay at the top of the page

**What to capture:**
- The **"Team Utilization"** section showing:
  - The filter buttons at the top: Critical, Low, Moderate, Optimal, Over-allocated
  - The KEY legend showing color gradient (orange → yellow → blue → green → red)
  - **Multiple team members** in the table with:
    - Colored utilization boxes (show variety: orange, yellow, blue, green, red if possible)
    - Names and departments
    - Hours logged / available
    - Utilization percentages
  - Pagination controls at the bottom ("Showing 1-10 of 49")
  - **Summary totals** at the bottom:
    - Total hours logged
    - Total hours available
    - Average team utilization

**Tips:**
- Make sure the gradient colors are clearly visible on each utilization box
- Try to capture a variety of utilization levels (show someone in orange, yellow, blue, green if possible)
- Show the filter buttons with at least one selected (e.g., click "All" to show everyone)
- Capture the summary totals section

**Screenshot type:** Full "Team Utilization" card

---

## After Taking Screenshots

1. **Save all 4 screenshots** to `frontend/static/screenshots/`
   ```
   frontend/static/screenshots/
   ├── analytics-dashboard.png
   ├── burnout-risk-modal.png
   ├── skills-gap-analysis.png
   └── capacity-planning.png
   ```

2. **Verify file names match exactly** (case-sensitive!)

3. The landing page will automatically load these images when you refresh

4. **Optional:** Compress images for web:
   - Use tinypng.com or similar
   - Aim for under 500KB per image
   - Maintain good quality (80-90%)

---

## Troubleshooting

**"I don't see the Burnout Risk alert"**
- You need over-allocated team members (>100% utilization)
- Go to `/people` and check if anyone is showing >100%
- If not, the test data may need adjustment

**"The modal doesn't have hiring recommendations"**
- This only shows if there are critical skill gaps where <3 people have the skill
- It's okay if this section doesn't appear - focus on the redistribution section

**"I can't fit everything in one screenshot"**
- For #1 (Analytics Dashboard): Take a full-page screenshot or stitch 2-3 screenshots together
- For #3 (Skills Gap): You may need to capture both panels separately and stitch them
- For #4 (Capacity): Just capture the "Team Utilization" card, don't include "Capacity by Department"

**"Screenshots look blurry"**
- Make sure your browser is at 100% zoom (not zoomed in/out)
- Use a retina/high-DPI display if possible
- Save as PNG (not JPG) for crisp text

---

## Example Screenshot Sizes

Target dimensions (approximate):
- **#1 Analytics Dashboard:** 1920x1400px (tall, full page)
- **#2 Burnout Modal:** 1920x1080px (standard)
- **#3 Skills Gap:** 1920x900px (shorter, just the Talent Optimization section)
- **#4 Capacity Planning:** 1920x1000px (medium, Team Utilization card)

All images will be automatically sized to fit the landing page layout (responsive).
