<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';

  type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  type Size = 'sm' | 'md' | 'lg' | 'icon';

  interface $$Props extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    href?: string;
    class?: string;
  }

  export let variant: Variant = 'default';
  export let size: Size = 'md';
  export let loading = false;
  export let href: string | undefined = undefined;
  let className = '';
  export { className as class };

  const variants: Record<Variant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-lg',
    icon: 'h-10 w-10',
  };

  $: classes = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className
  );
</script>

{#if href}
  <a {href} class={classes} {...$$restProps}>
    <slot />
  </a>
{:else}
  <button
    {...$$restProps}
    class={classes}
    disabled={loading || $$restProps.disabled}
    on:click
  >
    {#if loading}
      <svg
        class="h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    {/if}
    <slot />
  </button>
{/if}
