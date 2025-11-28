<script lang="ts">
  import { Card } from '$components/shared';
  import { Clock, Play } from 'lucide-svelte';
  import { format } from 'date-fns';

  export let activeTimer: {
    startTime: string;
    taskId: string | null;
    description: string | null;
    task: {
      id: string;
      title: string;
      project: {
        id: string;
        code: string;
        name: string;
      };
    } | null;
    elapsedSeconds: number;
  };
  export let elapsedSeconds: number;
  export let linkTo: string = '/time';
  export let compact: boolean = false;

  function formatElapsed(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Determine what to display
  $: title = activeTimer.task?.title || activeTimer.description || 'Timer Running';
  $: subtitle = activeTimer.task
    ? `${activeTimer.task.project.code} - ${activeTimer.task.project.name}`
    : 'No project';
  $: showDescription = activeTimer.description && activeTimer.task?.title;
</script>

<Card class="border-primary bg-primary/5 {compact ? 'p-4' : 'p-6'}">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-{compact ? '3' : '4'}">
      <div
        class="flex items-center justify-center rounded-full bg-primary text-primary-foreground {compact
          ? 'h-10 w-10'
          : 'h-12 w-12'}"
      >
        {#if compact}
          <Play class="h-5 w-5 animate-pulse" />
        {:else}
          <Clock class="h-6 w-6 animate-pulse" />
        {/if}
      </div>
      <div>
        <p class="font-medium">{title}</p>
        <p class="text-sm text-muted-foreground">
          {subtitle}
          {#if showDescription}
            <span class="text-muted-foreground/70">- {activeTimer.description}</span>
          {/if}
        </p>
      </div>
    </div>
    <div class="text-right">
      <p class="font-mono font-bold text-primary {compact ? 'text-2xl' : 'text-3xl'}">
        {formatElapsed(elapsedSeconds)}
      </p>
      {#if compact}
        <a href={linkTo} class="text-sm text-primary hover:underline">View Timer →</a>
      {:else}
        <p class="text-sm text-muted-foreground">
          Started at {format(new Date(activeTimer.startTime), 'h:mm a')}
        </p>
      {/if}
    </div>
  </div>
</Card>
