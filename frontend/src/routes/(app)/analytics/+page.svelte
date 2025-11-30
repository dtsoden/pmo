<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type ProjectsSummary, type TimeSummary, type CapacityAnalytics, type UtilizationReport } from '$lib/api/client';
  import { Card, Button, Badge, Spinner } from '$components/shared';
  import {
    formatCurrency,
    formatHours,
    formatPercent,
    getProjectStatusVariant,
    getPriorityVariant,
    getUtilizationColor,
    getUtilizationBgStyle,
    PROJECT_STATUS_LABELS,
    PRIORITY_LABELS,
  } from '$lib/utils';
  import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Users,
    Clock,
    Target,
    AlertTriangle,
    Briefcase,
    Activity,
    BarChart3,
  } from 'lucide-svelte';
  import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let projectsSummary: ProjectsSummary | null = null;
  let timeSummary: TimeSummary | null = null;
  let capacityAnalytics: CapacityAnalytics | null = null;
  let utilization: UtilizationReport | null = null;
  let loading = true;
  let error = '';

  // Default to current month for time analytics
  const now = new Date();
  const defaultStartDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const defaultEndDate = format(endOfMonth(now), 'yyyy-MM-dd');

  async function loadData() {
    loading = true;
    error = '';

    try {
      const [projectsRes, timeRes, capacityRes, utilizationRes] = await Promise.all([
        api.analytics.projectsSummary(),
        api.analytics.timeSummary({ startDate: defaultStartDate, endDate: defaultEndDate }),
        api.analytics.capacityOverview(),
        api.capacity.utilization({
          startDate: defaultStartDate,
          endDate: defaultEndDate,
        }),
      ]);

      projectsSummary = projectsRes;
      timeSummary = timeRes;
      capacityAnalytics = capacityRes;
      utilization = utilizationRes;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load analytics';
    } finally {
      loading = false;
    }
  }

  onMount(loadData);

  // Financial calculations
  $: billabilityRate =
    timeSummary?.totalHours && timeSummary.billableHours
      ? (timeSummary.billableHours / timeSummary.totalHours) * 100
      : 0;

  // Assume $150/hr average blended rate (can be made configurable)
  const AVERAGE_RATE = 150;
  $: potentialRevenue = (timeSummary?.billableHours || 0) * AVERAGE_RATE;
  $: lostRevenue = (timeSummary?.nonBillableHours || 0) * AVERAGE_RATE;

  // Utilization categories
  $: overAllocated = (utilization?.users || []).filter(u => u?.utilization > 100).length;
  $: underUtilized = (utilization?.users || []).filter(u => u?.utilization < 50).length;
  $: optimal = (utilization?.users || []).filter(u => u?.utilization >= 80 && u?.utilization <= 100).length;
  $: avgUtilization = utilization?.summary?.averageUtilization || 0;

  // Project health
  $: activeProjects = projectsSummary?.byStatus['ACTIVE'] || 0;
  $: criticalProjects = projectsSummary?.byPriority['CRITICAL'] || 0;
  $: urgentProjects = projectsSummary?.byPriority['URGENT'] || 0;
  $: atRiskProjects = criticalProjects + urgentProjects;

  // Top departments by utilization
  $: topDepartments = (capacityAnalytics?.byDepartment || [])
    .slice()
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 5);

  // Top contributors (by hours)
  $: topContributors = (timeSummary?.byUser || [])
    .slice()
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  // Talent optimization - chronically underutilized staff
  $: developmentCandidates = (utilization?.users || [])
    .filter(u => u?.utilization < 40) // Below 40% is concerning
    .sort((a, b) => a.utilization - b.utilization) // Worst first
    .slice(0, 10);

  $: skillsInvestmentNeeded = (utilization?.users || [])
    .filter(u => u?.utilization >= 40 && u?.utilization < 65) // 40-65% could be improved
    .sort((a, b) => a.utilization - b.utilization)
    .slice(0, 10);

  // Project status for donut chart
  $: projectStatusData = Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => ({
    status,
    label,
    count: projectsSummary?.byStatus[status as keyof typeof PROJECT_STATUS_LABELS] || 0,
    color: getStatusColor(status),
  }));

  function getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return '#2563eb'; // blue
      case 'PLANNING':
        return '#8b5cf6'; // purple
      case 'ON_HOLD':
        return '#f59e0b'; // amber
      case 'COMPLETED':
        return '#22c55e'; // green
      case 'CANCELLED':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }

  // Calculate donut chart SVG paths
  function calculateDonutSegments(data: { count: number; color: string; label: string }[]) {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return [];

    let currentAngle = -90; // Start at top
    const radius = 80;
    const innerRadius = 50;
    const cx = 100;
    const cy = 100;

    return data.map((item) => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;

      const startAngle = (currentAngle * Math.PI) / 180;
      const endAngle = ((currentAngle + angle) * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const x3 = cx + innerRadius * Math.cos(endAngle);
      const y3 = cy + innerRadius * Math.sin(endAngle);
      const x4 = cx + innerRadius * Math.cos(startAngle);
      const y4 = cy + innerRadius * Math.sin(startAngle);

      const largeArc = angle > 180 ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      currentAngle += angle;

      return {
        path,
        color: item.color,
        label: item.label,
        count: item.count,
        percentage: percentage.toFixed(1),
      };
    });
  }

  $: donutSegments = calculateDonutSegments(projectStatusData);
</script>

<svelte:head>
  <title>Analytics - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Executive Dashboard</h1>
      <p class="text-muted-foreground">Real-time business intelligence • {format(now, 'MMMM yyyy')}</p>
    </div>
    <Button variant="outline" on:click={loadData}>Refresh Data</Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadData}>Retry</Button>
      </div>
    </Card>
  {:else}
    <!-- Financial KPIs -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Potential Revenue -->
      <Card class="p-6 border-l-4 border-l-green-500">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign class="h-4 w-4" />
              <span>Billable Revenue</span>
            </div>
            <p class="mt-2 text-3xl font-bold">{formatCurrency(potentialRevenue)}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {formatHours(timeSummary?.billableHours || 0)} @ ${AVERAGE_RATE}/hr
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
            <TrendingUp class="h-6 w-6 text-green-600 dark:text-green-300" />
          </div>
        </div>
      </Card>

      <!-- Lost Revenue -->
      <Card class="p-6 border-l-4 border-l-amber-500">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle class="h-4 w-4" />
              <span>Non-Billable Opportunity</span>
            </div>
            <p class="mt-2 text-3xl font-bold">{formatCurrency(lostRevenue)}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {formatHours(timeSummary?.nonBillableHours || 0)} non-billable
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
            <TrendingDown class="h-6 w-6 text-amber-600 dark:text-amber-300" />
          </div>
        </div>
      </Card>

      <!-- Billability Rate -->
      <Card class="p-6 border-l-4 border-l-blue-500">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Target class="h-4 w-4" />
              <span>Billability Rate</span>
            </div>
            <p class="mt-2 text-3xl font-bold">{billabilityRate.toFixed(1)}%</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Target: 75% • {billabilityRate >= 75 ? 'On Track' : 'Below Target'}
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <BarChart3 class="h-6 w-6 text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </Card>

      <!-- Team Utilization -->
      <Card class="p-6 border-l-4 border-l-purple-500">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity class="h-4 w-4" />
              <span>Avg Team Utilization</span>
            </div>
            <p class="mt-2 text-3xl font-bold">{avgUtilization.toFixed(0)}%</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {optimal} optimal • {overAllocated} over-allocated
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
            <Users class="h-6 w-6 text-purple-600 dark:text-purple-300" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Middle Row: Project Portfolio + Team Health -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Project Portfolio Health (Donut Chart) -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Project Portfolio Health</h2>
          <p class="text-sm text-muted-foreground">{projectsSummary?.total || 0} Total Projects</p>
        </div>
        <div class="p-6">
          {#if projectsSummary?.total === 0}
            <div class="text-center text-muted-foreground py-8">No projects yet</div>
          {:else}
            <div class="flex items-center gap-8">
              <!-- Donut Chart -->
              <div class="flex-shrink-0">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {#each donutSegments as segment}
                    <path d={segment.path} fill={segment.color} opacity="0.9" />
                  {/each}
                  <!-- Center text -->
                  <text x="100" y="95" text-anchor="middle" class="text-2xl font-bold fill-current">
                    {projectsSummary?.total || 0}
                  </text>
                  <text x="100" y="115" text-anchor="middle" class="text-sm fill-current opacity-70">
                    Projects
                  </text>
                </svg>
              </div>

              <!-- Legend -->
              <div class="flex-1 space-y-3">
                {#each donutSegments as segment}
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="h-3 w-3 rounded-full" style="background-color: {segment.color}" />
                      <span class="text-sm font-medium">{segment.label}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-sm text-muted-foreground">{segment.percentage}%</span>
                      <span class="text-sm font-bold min-w-[2rem] text-right">{segment.count}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- At-Risk Alert -->
            {#if atRiskProjects > 0}
              <div class="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div class="flex items-center gap-2">
                  <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span class="font-semibold text-red-900 dark:text-red-100">
                    {atRiskProjects} High-Priority Project{atRiskProjects > 1 ? 's' : ''} Need Attention
                  </span>
                </div>
                <p class="mt-1 text-sm text-red-700 dark:text-red-300 ml-7">
                  {criticalProjects} critical, {urgentProjects} urgent
                </p>
              </div>
            {/if}
          {/if}
        </div>
      </Card>

      <!-- Team Capacity Health -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Team Capacity Health</h2>
          <p class="text-sm text-muted-foreground">
            {utilization?.users?.length || 0} Active Team Members
          </p>
        </div>
        <div class="p-6">
          <!-- Capacity Distribution -->
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between text-sm mb-2">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full" style="background-color: {getUtilizationColor(90)}" />
                  <span class="font-medium">Optimal (80-100%)</span>
                </div>
                <span class="font-bold">{optimal}</span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full transition-all"
                  style="background-color: {getUtilizationColor(90)}; width: {(optimal / (utilization?.users?.length || 1)) * 100}%"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-2">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full bg-red-500" />
                  <span class="font-medium">Over-Allocated (&gt;100%)</span>
                </div>
                <span class="font-bold">{overAllocated}</span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full bg-red-500 transition-all"
                  style="width: {(overAllocated / (utilization?.users?.length || 1)) * 100}%"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-2">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full" style="background-color: {getUtilizationColor(37)}" />
                  <span class="font-medium">Under-Utilized (&lt;50%)</span>
                </div>
                <span class="font-bold">{underUtilized}</span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full transition-all"
                  style="background-color: {getUtilizationColor(37)}; width: {(underUtilized / (utilization?.users?.length || 1)) * 100}%"
                />
              </div>
            </div>
          </div>

          <!-- Insights -->
          <div class="mt-6 space-y-2">
            {#if overAllocated > 0}
              <div class="flex items-start gap-2 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle class="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span class="font-semibold text-red-900 dark:text-red-100">Burnout Risk: </span>
                  <span class="text-red-700 dark:text-red-300">
                    {overAllocated} team member{overAllocated > 1 ? 's are' : ' is'} over-allocated.
                    Consider redistributing workload.
                  </span>
                </div>
              </div>
            {/if}
            {#if underUtilized > 3}
              <div class="flex items-start gap-2 text-sm p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Clock class="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span class="font-semibold text-amber-900 dark:text-amber-100">Available Capacity: </span>
                  <span class="text-amber-700 dark:text-amber-300">
                    {underUtilized} team members have capacity for additional work.
                  </span>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </Card>
    </div>

    <!-- Bottom Row: Top Contributors + Department Performance -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Top Contributors -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Top Contributors</h2>
          <p class="text-sm text-muted-foreground">By hours logged this month</p>
        </div>
        <div class="divide-y">
          {#if topContributors.length === 0}
            <div class="p-6 text-center text-muted-foreground">No time data available</div>
          {:else}
            {#each topContributors as contributor, index}
              {@const user = utilization?.users?.find(u => u.user?.id === contributor.userId)}
              {@const userUtilization = user?.utilization || 0}
              <div class="px-6 py-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p class="font-medium">{contributor.userName}</p>
                      <p class="text-xs text-muted-foreground">
                        {formatPercent(userUtilization)} utilization
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-bold">{formatHours(contributor.hours)}</p>
                    <div
                      class="mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={getUtilizationBgStyle(userUtilization)}
                    >
                      {userUtilization.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </Card>

      <!-- Department Performance -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Department Performance</h2>
          <p class="text-sm text-muted-foreground">Utilization by department</p>
        </div>
        <div class="divide-y">
          {#if topDepartments.length === 0}
            <div class="p-6 text-center text-muted-foreground">No department data available</div>
          {:else}
            {#each topDepartments as dept}
              <div class="px-6 py-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <Briefcase class="h-5 w-5 text-muted-foreground" />
                    <span class="font-medium">{dept.department || 'Unassigned'}</span>
                  </div>
                  <div
                    class="px-3 py-1 rounded-lg font-semibold text-white text-sm"
                    style={getUtilizationBgStyle(dept.utilization)}
                  >
                    {formatPercent(dept.utilization)}
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{dept.allocated.toFixed(0)}h allocated</span>
                  <span>{dept.capacity.toFixed(0)}h capacity</span>
                </div>
                <div class="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full transition-all"
                    style="{getUtilizationBgStyle(dept.utilization)}; width: {Math.min(dept.utilization, 100)}%"
                  />
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </Card>
    </div>

    <!-- Talent Optimization - Strategic Workforce Planning -->
    <Card>
      <div class="border-b px-6 py-4 bg-slate-50 dark:bg-slate-900">
        <h2 class="font-semibold text-lg">Talent Optimization</h2>
        <p class="text-sm text-muted-foreground">Strategic workforce planning based on project demand and utilization</p>
      </div>
      <div class="grid gap-6 lg:grid-cols-2 p-6">
        <!-- Skills Development Opportunities -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold">Skills Development Opportunities</h3>
              <p class="text-xs text-muted-foreground mt-1">
                Team members with capacity for training and project reassignment
              </p>
            </div>
            <Badge variant="info" class="text-xs">
              {skillsInvestmentNeeded.length} candidates
            </Badge>
          </div>

          {#if skillsInvestmentNeeded.length === 0}
            <div class="text-center py-8 text-muted-foreground text-sm">
              All team members are well-utilized
            </div>
          {:else}
            <div class="space-y-3">
              {#each skillsInvestmentNeeded.slice(0, 5) as user}
                {@const utilPercent = user?.utilization || 0}
                <div class="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex-1">
                      <p class="font-medium text-sm">
                        {user.user?.firstName} {user.user?.lastName}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {user.user?.department || 'Unassigned'}
                      </p>
                    </div>
                    <div class="text-right">
                      <div
                        class="inline-block px-2 py-1 rounded text-xs font-semibold text-white"
                        style={getUtilizationBgStyle(utilPercent)}
                      >
                        {utilPercent.toFixed(0)}%
                      </div>
                      <p class="text-xs text-muted-foreground mt-1">
                        {((user.availableHours || 0) - (user.loggedHours || 0)).toFixed(0)}h available
                      </p>
                    </div>
                  </div>
                  <div class="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <Target class="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p class="text-blue-700 dark:text-blue-300">
                      <span class="font-semibold">Action:</span> Skill development opportunity.
                      Review project pipeline for skills training alignment.
                    </p>
                  </div>
                </div>
              {/each}
              {#if skillsInvestmentNeeded.length > 5}
                <p class="text-xs text-center text-muted-foreground">
                  +{skillsInvestmentNeeded.length - 5} more team members with development potential
                </p>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Bench Considerations -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold">Resource Optimization Review</h3>
              <p class="text-xs text-muted-foreground mt-1">
                Chronically underutilized resources requiring strategic review
              </p>
            </div>
            <Badge variant={developmentCandidates.length > 0 ? 'warning' : 'default'} class="text-xs">
              {developmentCandidates.length} flagged
            </Badge>
          </div>

          {#if developmentCandidates.length === 0}
            <div class="text-center py-8 text-muted-foreground text-sm">
              No chronic underutilization detected
            </div>
          {:else}
            <div class="space-y-3">
              {#each developmentCandidates.slice(0, 5) as user}
                {@const utilPercent = user?.utilization || 0}
                {@const monthlyCapacity = user?.availableHours || 0}
                {@const unusedCapacity = monthlyCapacity - (user?.loggedHours || 0)}
                {@const costImpact = unusedCapacity * AVERAGE_RATE}
                <div class="p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex-1">
                      <p class="font-medium text-sm">
                        {user.user?.firstName} {user.user?.lastName}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {user.user?.department || 'Unassigned'}
                      </p>
                    </div>
                    <div class="text-right">
                      <div
                        class="inline-block px-2 py-1 rounded text-xs font-semibold text-white"
                        style={getUtilizationBgStyle(utilPercent)}
                      >
                        {utilPercent.toFixed(0)}%
                      </div>
                      <p class="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                        {formatCurrency(costImpact)} impact
                      </p>
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-muted-foreground">Unused capacity:</span>
                      <span class="font-medium">{unusedCapacity.toFixed(0)}h this month</span>
                    </div>
                    <div class="flex items-start gap-2 text-xs bg-amber-100 dark:bg-amber-900/30 p-2 rounded border border-amber-300 dark:border-amber-700">
                      <AlertTriangle class="h-3 w-3 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p class="text-amber-800 dark:text-amber-300">
                        <span class="font-semibold">Strategic Options:</span>
                        (1) Skills training for active project needs,
                        (2) Project reassignment,
                        (3) Bench release consideration
                      </p>
                    </div>
                  </div>
                </div>
              {/each}
              {#if developmentCandidates.length > 5}
                <p class="text-xs text-center text-muted-foreground">
                  +{developmentCandidates.length - 5} more resources requiring review
                </p>
              {/if}
            </div>

            <!-- Summary Impact -->
            {#if developmentCandidates.length > 0}
              {@const totalUnusedHours = developmentCandidates.reduce((sum, u) =>
                sum + ((u.availableHours || 0) - (u.loggedHours || 0)), 0
              )}
              {@const totalCostImpact = totalUnusedHours * AVERAGE_RATE}
              <div class="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-semibold">Monthly Cost Impact</span>
                  <span class="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {formatCurrency(totalCostImpact)}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground">
                  {totalUnusedHours.toFixed(0)} unused hours across {developmentCandidates.length} team members
                </p>
                <div class="mt-3 pt-3 border-t border-slate-300 dark:border-slate-600">
                  <p class="text-xs font-medium mb-2">Recommended Actions:</p>
                  <ul class="text-xs space-y-1 text-muted-foreground">
                    <li>• Review current project pipeline for skills alignment</li>
                    <li>• Identify training opportunities based on in-demand project skills</li>
                    <li>• Consider strategic workforce adjustments for optimal resource allocation</li>
                  </ul>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </Card>
  {/if}
</div>
