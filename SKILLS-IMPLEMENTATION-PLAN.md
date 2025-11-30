# Skills Matching Implementation Plan

## Goal
Implement skills gap analysis to show:
1. Which skills are in HIGH demand (many projects need them)
2. Which skills are in LOW supply (few people have them)
3. Specific training recommendations for underutilized staff
4. Skills-based bench release decisions

## Implementation Steps

### 1. Backend - Add Skills Analytics Endpoint
**File**: `backend/src/modules/analytics/analytics.routes.ts`
**New endpoint**: `GET /api/analytics/skills-gap`

Returns:
```typescript
{
  skillsDemand: [
    { skill: 'React', projectCount: 15, taskCount: 45 },
    { skill: 'Python', projectCount: 12, taskCount: 38 }
  ],
  skillsSupply: [
    { skill: 'React', userCount: 8 },
    { skill: 'Python', userCount: 5 }
  ],
  skillsGap: [
    { skill: 'React', demand: 45, supply: 8, gap: 37, severity: 'HIGH' },
    { skill: 'Python', demand: 38, supply: 5, gap: 33, severity: 'CRITICAL' }
  ],
  trainingRecommendations: [
    {
      userId: 'xxx',
      userName: 'Sarah Johnson',
      currentUtilization: 35,
      recommendedSkills: ['React', 'TypeScript'],
      potentialProjectMatches: 3
    }
  ]
}
```

### 2. Backend - Service Layer
**File**: `backend/src/modules/analytics/analytics.service.ts`
**New function**: `getSkillsGapAnalysis()`

Logic:
1. Get all ACTIVE/PLANNING projects and their tags
2. Get all IN_PROGRESS/TODO tasks and their tags
3. Count demand per skill (unique tag occurrences)
4. Get all ACTIVE users and their skills
5. Count supply per skill (user count)
6. Calculate gap: demand - supply
7. For underutilized users (<65%), find matching skills gaps
8. Return structured data

### 3. Frontend - API Client
**File**: `frontend/src/lib/api/client.ts`
Add:
```typescript
skillsGap: async () => {
  const res = await this.request<{ analysis: SkillsGapAnalysis }>('/analytics/skills-gap');
  return res.analysis;
}
```

### 4. Frontend - Analytics Page
**File**: `frontend/src/routes/(app)/analytics/+page.svelte`
- Call `api.analytics.skillsGap()` on mount
- Display skills in demand
- Show specific training recommendations per person
- Link skills to projects

### 5. Database - Live Update
**File**: `backend/scripts/update-live-skills.ts`
- Check if users already have skills populated
- If not, assign random skills based on job title/department
- Do NOT wipe any data

### 6. Seed Script Update
**File**: `backend/scripts/seed-test-data.ts`
- Already has skills (line 278) ✅
- Verify tags on tasks align with user skills
