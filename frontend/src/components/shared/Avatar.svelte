<script lang="ts">
  import { cn, initials } from '$lib/utils';

  export let src: string | undefined = undefined;
  export let firstName: string | undefined = undefined;
  export let lastName: string | undefined = undefined;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  let className = '';
  export { className as class };

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  $: displayInitials = initials(firstName, lastName);
</script>

<div
  class={cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
    sizes[size],
    className
  )}
>
  {#if src}
    <img {src} alt="{firstName} {lastName}" class="h-full w-full object-cover" />
  {:else}
    <span class="font-medium text-muted-foreground">{displayInitials}</span>
  {/if}
</div>
