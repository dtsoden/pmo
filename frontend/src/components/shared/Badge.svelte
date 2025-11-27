<script lang="ts">
  import { cn } from '$lib/utils';

  type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';

  export let variant: Variant = 'default';
  let className = '';
  export { className as class };

  const variants: Record<Variant, string> = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    outline: 'border border-current bg-transparent',
  };
</script>

<span
  class={cn(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    variants[variant],
    className
  )}
>
  <slot />
</span>
