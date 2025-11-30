<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let images: Array<{ src: string; alt: string }> = [];
  export let autoPlayInterval = 3000; // 3 seconds
  export let showControls = true;
  export let showIndicators = true;

  let currentIndex = 0;
  let autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  let isPaused = false;

  function nextSlide() {
    currentIndex = (currentIndex + 1) % images.length;
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
  }

  function goToSlide(index: number) {
    currentIndex = index;
  }

  function startAutoPlay() {
    if (autoPlayTimer) return;
    autoPlayTimer = setInterval(() => {
      if (!isPaused) {
        nextSlide();
      }
    }, autoPlayInterval);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  onMount(() => {
    startAutoPlay();
  });

  onDestroy(() => {
    stopAutoPlay();
  });

  function handleMouseEnter() {
    isPaused = true;
  }

  function handleMouseLeave() {
    isPaused = false;
  }
</script>

<div
  class="relative overflow-hidden rounded-lg border-2 border-primary/20 bg-muted"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  role="region"
  aria-label="Image carousel"
>
  <!-- Images Container -->
  <div class="relative" style="aspect-ratio: 16/9">
    {#each images as image, index}
      <div
        class="absolute inset-0 transition-opacity duration-500"
        class:opacity-100={index === currentIndex}
        class:opacity-0={index !== currentIndex}
        class:pointer-events-none={index !== currentIndex}
      >
        <img
          src={image.src}
          alt={image.alt}
          class="h-full w-full object-contain"
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      </div>
    {/each}
  </div>

  <!-- Previous/Next Controls -->
  {#if showControls && images.length > 1}
    <button
      type="button"
      class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-lg transition-all hover:bg-background hover:scale-110"
      on:click={prevSlide}
      aria-label="Previous image"
    >
      <ChevronLeft class="h-6 w-6" />
    </button>
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-lg transition-all hover:bg-background hover:scale-110"
      on:click={nextSlide}
      aria-label="Next image"
    >
      <ChevronRight class="h-6 w-6" />
    </button>
  {/if}

  <!-- Dot Indicators -->
  {#if showIndicators && images.length > 1}
    <div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
      {#each images as _, index}
        <button
          type="button"
          class="h-2 w-2 rounded-full transition-all"
          class:bg-primary={index === currentIndex}
          class:w-8={index === currentIndex}
          class:bg-muted-foreground/50={index !== currentIndex}
          on:click={() => goToSlide(index)}
          aria-label={`Go to slide ${index + 1}`}
        />
      {/each}
    </div>
  {/if}

  <!-- Image Counter -->
  <div class="absolute top-4 right-4 rounded-lg bg-background/80 px-3 py-1 text-sm font-medium shadow-lg">
    {currentIndex + 1} / {images.length}
  </div>
</div>
