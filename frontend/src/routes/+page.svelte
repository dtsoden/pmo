<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { isAuthenticated, isInitialized } from '$lib/stores/auth';
  import { Button, Card, Spinner } from '$components/shared';
  import ImageCarousel from '$lib/components/ImageCarousel.svelte';
  import Modal from '$components/shared/Modal.svelte';
  import {
    FolderKanban,
    Users,
    Clock,
    ArrowRight,
    Database,
    ShieldCheck,
    Zap,
    TrendingUp,
    CalendarClock,
    FileBarChart,
    Network,
    CheckCircle2,
    Building2,
    Briefcase,
    Code,
    Rocket,
    Heart,
    Layers,
    Timer,
    UserCheck,
    Lock,
    GitBranch,
    Github,
    Download,
    AlertTriangle,
    PlayCircle,
    ChevronRight,
    MousePointerClick,
    BrainCircuit,
    Sparkles,
    FileJson,
    ExternalLink
  } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let title = 'PMO Platform - Enterprise Project Management You Own';
  let year = new Date().getFullYear();
  let showPayloadModal = false;

  // Time tracking carousel images
  const timeTrackingImages = [
    { src: '/screenshots/time-tracking.png', alt: 'Chrome Extension Time Tracking - Active Timer' },
    { src: '/screenshots/time-tracking-2.png', alt: 'Time Tracking Dashboard - Reports and History' }
  ];

  // Analytics carousel images
  const analyticsImages = [
    { src: '/screenshots/analytics-dashboard.png', alt: 'Executive Analytics Dashboard - Financial KPIs and Project Health' },
    { src: '/screenshots/analytics-dashboard-2.png', alt: 'Burnout Risk Detection and Workload Redistribution' },
    { src: '/screenshots/analytics-dashboard-3.png', alt: 'Skills Gap Analysis with Training Recommendations' },
    { src: '/screenshots/analytics-dashboard-4.png', alt: 'Team Capacity Health and Utilization Metrics' },
    { src: '/screenshots/analytics-dashboard-5.png', alt: 'Project Portfolio Overview and Department Performance' }
  ];

  // Leave request carousel images
  const leaveRequestImages = [
    { src: '/screenshots/leave-requests.png', alt: 'Leave Request Management - Personal Dashboard' },
    { src: '/screenshots/leave-requests-2.png', alt: 'Leave Request Approval Workflow - Manager View' },
    { src: '/screenshots/leave-requests-3.png', alt: 'Capacity Planning Integration - Recent Time Off Requests' }
  ];

  onMount(() => {
    const unsubscribe = isInitialized.subscribe((initialized) => {
      if (initialized && $isAuthenticated && browser) {
        window.location.href = '/dashboard';
      }
    });

    return unsubscribe;
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    name="description"
    content="Free, enterprise-grade PMO platform with real-time time tracking, Chrome extension, automated task shortcuts, capacity planning, and executive analytics. Own your platform. Own your data."
  />

  <!-- SEO Meta Tags -->
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="David Soden" />
  <meta name="keywords" content="free project management software, open source PMO platform, enterprise project management, resource allocation tool, team capacity planning software, time tracking software, billable hours tracking, project portfolio management, workforce planning tool, Asana alternative, Monday.com alternative, Jira alternative, free resource management, project management office software, real-time time tracking, Chrome extension time tracker, WebSocket project management, capacity planning software, burnout detection, skills gap analysis, utilization analytics, project budget tracking, task dependency management, approval workflows, self-hosted project management" />
  <link rel="canonical" href="https://pmoplatform.com/" />

  <!-- Preload Critical Assets -->
  <link rel="preload" href="/logo.png" as="image" />
  <link rel="dns-prefetch" href="https://github.com" />

  <!-- Sitemap -->
  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

  <!-- Open Graph / Facebook / LinkedIn -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pmoplatform.com/" />
  <meta property="og:title" content="PMO Platform - Enterprise Project Management You Own" />
  <meta property="og:description" content="Free, enterprise-grade PMO platform with real-time time tracking, Chrome extension, automated task shortcuts, capacity planning, and executive analytics. Own your platform. Own your data." />
  <meta name="image" property="og:image" content="https://pmoplatform.com/socal/social.png" />
  <meta property="og:image:secure_url" content="https://pmoplatform.com/socal/social.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="PMO Platform - Enterprise Project Management You Own" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:site_name" content="PMO Platform" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://pmoplatform.com/" />
  <meta name="twitter:title" content="PMO Platform - Enterprise Project Management You Own" />
  <meta name="twitter:description" content="Free, enterprise-grade PMO platform with real-time time tracking, Chrome extension, automated task shortcuts, capacity planning, and executive analytics. Own your platform. Own your data." />
  <meta name="twitter:image" content="https://pmoplatform.com/socal/social.png" />
  <meta name="twitter:image:alt" content="PMO Platform - Enterprise Project Management You Own" />

  <!-- Schema.org Structured Data (JSON-LD) -->
  {@html `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "PMO Platform",
        "url": "https://pmoplatform.com",
        "logo": "https://pmoplatform.com/logo.png",
        "description": "Free, enterprise-grade PMO platform with real-time time tracking, Chrome extension, and capacity planning.",
        "founder": {
          "@type": "Person",
          "name": "David Soden",
          "url": "https://davidsoden.com"
        },
        "sameAs": [
          "https://github.com/dtsoden/pmo"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "PMO Platform",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Project Management Software",
        "operatingSystem": "Web, Windows, macOS, Linux",
        "image": "https://pmoplatform.com/logo.png",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": "https://pmoplatform.com",
          "priceValidUntil": "2026-12-31",
          "description": "Free for in-house use. Commercial licensing available for resale.",
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "US",
            "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
            "merchantReturnDays": 0,
            "returnMethod": "https://schema.org/ReturnByMail",
            "returnFees": "https://schema.org/FreeReturn"
          },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": "0",
              "currency": "USD"
            },
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": "US"
            },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 0,
                "unitCode": "DAY"
              },
              "transitTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 0,
                "unitCode": "DAY"
              }
            }
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "ratingCount": "1",
          "bestRating": "5",
          "worstRating": "1"
        },
        "softwareVersion": "1.0",
        "description": "Enterprise-grade project management office platform with real-time time tracking, Chrome extension, automated task shortcuts, capacity planning, and executive analytics. Open source and free for internal use.",
        "url": "https://pmoplatform.com",
        "screenshot": "https://pmoplatform.com/screenshots/analytics-dashboard.png",
        "featureList": [
          "Real-time time tracking with Chrome extension",
          "Automated task shortcuts for assignments",
          "Executive analytics with burnout detection",
          "Visual capacity planning with gradient visualization",
          "Customizable dropdown lists",
          "Leave request approval workflows",
          "Time card API export for payroll systems",
          "WebSocket real-time sync",
          "7-tier role-based access control",
          "Multi-region timezone support",
          "Project budget and variance tracking",
          "Skills gap analysis and training recommendations"
        ],
        "softwareRequirements": "Node.js, PostgreSQL, Redis (optional)",
        "releaseNotes": "Open source release with full features",
        "codeRepository": "https://github.com/dtsoden/pmo",
        "license": "https://github.com/dtsoden/pmo/blob/main/LICENSE"
      },
      {
        "@type": "WebSite",
        "name": "PMO Platform",
        "url": "https://pmoplatform.com",
        "description": "Free, enterprise-grade PMO platform with real-time time tracking, Chrome extension, automated task shortcuts, capacity planning, and executive analytics.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://pmoplatform.com/?s={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Product",
        "name": "PMO Platform",
        "description": "Enterprise project management office software with real-time time tracking, capacity planning, and executive analytics. Free and open source for in-house use.",
        "image": "https://pmoplatform.com/logo.png",
        "brand": {
          "@type": "Brand",
          "name": "PMO Platform"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": "https://pmoplatform.com",
          "priceValidUntil": "2026-12-31",
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "US",
            "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
            "merchantReturnDays": 0,
            "returnMethod": "https://schema.org/ReturnByMail",
            "returnFees": "https://schema.org/FreeReturn"
          },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": "0",
              "currency": "USD"
            },
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": "US"
            },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 0,
                "unitCode": "DAY"
              },
              "transitTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 0,
                "unitCode": "DAY"
              }
            }
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "ratingCount": "1"
        },
        "category": "Project Management Software"
      }
    ]
  }
  </script>`}
</svelte:head>

{#if !$isInitialized}
  <div class="flex h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
{:else}
  <div class="min-h-screen bg-background">
    <!-- Hero Section -->
    <section class="border-b bg-background">
      <div class="container mx-auto px-4 py-24 sm:py-32">
        <div class="mx-auto max-w-5xl text-center">
          <!-- Logo -->
          <div class="mb-12 flex justify-center">
            <img
              src="/logo.png"
              alt="PMO Platform Logo"
              class="h-24 w-auto sm:h-32"
            />
          </div>

          <div class="mb-8 flex flex-wrap items-center justify-center gap-3">
            <div class="inline-flex items-center gap-2 rounded-lg border bg-muted px-4 py-2 text-sm">
              <Database class="h-4 w-4 text-primary" />
              <span>Own Your Platform. Own Your Data.</span>
            </div>
            <a
              href="https://github.com/dtsoden/pmo"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-lg border bg-muted px-4 py-2 text-sm transition-colors hover:bg-muted/80"
            >
              <Github class="h-4 w-4" />
              <span>Open Source on GitHub</span>
            </a>
          </div>
          <h1 class="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Stop Using Spreadsheets for
            <span class="text-primary">Enterprise PMO</span>
          </h1>
          <p class="mx-auto mb-4 max-w-3xl text-lg text-muted-foreground sm:text-xl">
            A complete project management office platform with real-time time tracking, Chrome extension,
            automated task creation, capacity planning, and executive analytics. Built for enterprises
            that need professional solutions without the enterprise price tag.
          </p>
          <p class="mx-auto mb-10 max-w-2xl text-base text-muted-foreground">
            Free for in-house use. No vendor lock-in. No per-seat fees. Deploy it, customize it,
            and make it yours.
          </p>
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/login" size="lg" class="min-w-[200px]">
              Sign In
              <ArrowRight class="ml-2 h-4 w-4" />
            </Button>
            <Button
              href="https://github.com/dtsoden/pmo"
              variant="outline"
              size="lg"
              class="min-w-[200px]"
            >
              <Github class="mr-2 h-4 w-4" />
              View on GitHub
            </Button>
          </div>
          <p class="mt-6 text-sm text-muted-foreground">
            Open source and available on GitHub. Deploy on your infrastructure.
          </p>
        </div>
      </div>
    </section>

    <!-- The Real Problem We Solve -->
    <section class="border-b bg-sky-50 dark:bg-sky-900/20">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto max-w-5xl">
          <div class="mb-12 text-center">
            <h2 class="mb-6 text-3xl font-bold sm:text-4xl">
              Love Your Staff. Use Empathy. Solve Problems Before They Happen.
            </h2>
            <p class="text-xl text-muted-foreground">
              Every leader knows the truth, but few have the data to fix it.
            </p>
          </div>

          <div class="mb-12 rounded-xl border-2 border-primary/20 bg-background p-8 sm:p-12">
            <div class="mb-8">
              <h3 class="mb-4 text-2xl font-bold">The 80/20 Reality</h3>
              <p class="mb-4 text-lg leading-relaxed text-muted-foreground">
                The Pareto Principle doesn't lie: <span class="font-semibold text-foreground">20% of your staff are carrying 80% of the load.</span> You know who they are. They're the ones working late, picking up slack, delivering results while drowning in over-allocation.
              </p>
              <p class="mb-4 text-lg leading-relaxed text-muted-foreground">
                The other 80%? <span class="font-semibold text-foreground">They're mismanaged.</span> Not all of them are lazy—most aren't. But without visibility into capacity, skills, and project demands, you're flying blind. Some team members sit underutilized because you don't know what they can do. Others are assigned work they're not equipped for. And yes, some are coasting under the radar.
              </p>
              <p class="text-lg leading-relaxed text-muted-foreground">
                <span class="font-semibold text-foreground">The result?</span> Burnout for your top performers. Wasted capacity in your bench. Missed opportunities because you didn't know Sarah had React skills or that John's been at 40% utilization for three months.
              </p>
            </div>

            <div class="border-t pt-8">
              <h3 class="mb-4 text-2xl font-bold">The Single Pane of Glass You've Been Missing</h3>
              <p class="mb-6 text-lg leading-relaxed text-muted-foreground">
                PMO Platform doesn't just track projects. It gives you <span class="font-semibold text-foreground">strategic workforce intelligence at scale</span>. See who's drowning, who's available, who can help, and what skills you need to hire for—all in real time.
              </p>
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="flex gap-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                    <Heart class="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 class="mb-2 font-semibold">Protect Your Top Performers</h4>
                    <p class="text-sm text-muted-foreground">
                      See who's over-allocated before they burn out. Get recommendations for who can help and redistribute work based on skills and capacity.
                    </p>
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Users class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 class="mb-2 font-semibold">Optimize Your Bench</h4>
                    <p class="text-sm text-muted-foreground">
                      Identify underutilized staff and get training recommendations matched to real project needs. Stop wasting capacity—invest it strategically.
                    </p>
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <TrendingUp class="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 class="mb-2 font-semibold">Make Data-Driven Decisions</h4>
                    <p class="text-sm text-muted-foreground">
                      Skills gaps, utilization rates, financial impact—everything you need to know, when you need to know it. No guesswork. No spreadsheets.
                    </p>
                  </div>
                </div>
                <div class="flex gap-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertTriangle class="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 class="mb-2 font-semibold">Solve Problems Proactively</h4>
                    <p class="text-sm text-muted-foreground">
                      Don't wait for people to quit or projects to fail. See issues coming and fix them before they become crises.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center">
            <p class="mb-6 text-lg text-muted-foreground">
              This isn't about micromanagement. It's about <span class="font-semibold text-foreground">empathy at scale</span>. When you understand your team's capacity, skills, and workload, you can lead with compassion and data—not gut feelings and politics.
            </p>
            <Button href="/login" size="lg" class="min-w-[240px]">
              See It In Action
              <ArrowRight class="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>

    <!-- Flagship Features -->
    <section class="border-b bg-background">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto mb-12 max-w-3xl text-center">
          <h2 class="mb-4 text-3xl font-bold sm:text-4xl">Features That Set Us Apart</h2>
          <p class="text-lg text-muted-foreground">
            Not just another project tracker. PMO Platform delivers real innovation with features
            that solve actual problems.
          </p>
        </div>

        <!-- Feature 1: Real-Time Time Tracking with Chrome Extension -->
        <div class="mb-16 rounded-lg border border-primary/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-primary p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <Timer class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Time Tracking</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Real-Time Timer with Chrome Extension
              </h3>
              <p class="mb-6 text-muted-foreground">
                Track time from anywhere with our Chrome extension. Start a timer on a task, and it syncs
                in real-time across all your devices via WebSocket. Switch from browser extension to web app
                seamlessly—your timer never misses a beat. Billable vs non-billable tracking built-in.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Chrome extension</strong> for one-click timer start/stop from any tab</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Real-time WebSocket sync</strong> across all devices and users</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Billable hour tracking</strong> with daily/weekly/monthly reports</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Active timer badge</strong> shows elapsed time in extension icon</span>
                </li>
              </ul>
            </div>
            <div>
              <ImageCarousel images={timeTrackingImages} autoPlayInterval={3000} />
            </div>
          </div>
        </div>

        <!-- Feature 2: Automated Task Shortcuts -->
        <div class="mb-16 rounded-lg border border-purple-500/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div class="order-2 lg:order-1">
              <div class="rounded-lg border-2 border-purple-500/20 overflow-hidden bg-muted">
                <img
                  src="/screenshots/task-shortcuts.png"
                  alt="Automated Task Shortcuts"
                  class="w-full h-auto"
                  loading="lazy"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                />
                <div class="hidden flex-col items-center justify-center p-12 bg-gradient-to-br from-purple-500/5 to-purple-500/20" style="aspect-ratio: 16/9">
                  <Sparkles class="h-32 w-32 text-purple-600 mb-6" />
                  <p class="text-lg font-semibold mb-2">Automated Task Creation</p>
                  <p class="text-sm text-muted-foreground">Screenshot coming soon</p>
                </div>
              </div>
            </div>
            <div class="order-1 lg:order-2">
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-purple-600 p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <BrainCircuit class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Smart Automation</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Automated Task Shortcuts for Assignments
              </h3>
              <p class="mb-6 text-muted-foreground">
                When you get assigned to a task, the system automatically creates a timer shortcut for you
                in the Chrome extension. No manual setup—just click the task from your shortcuts list and
                start tracking time instantly. Smart bidirectional syncing keeps everything in perfect harmony.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Auto-created shortcuts</strong> when assigned to tasks—zero manual work</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Searchable dropdown</strong> in extension for quick task selection</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Bidirectional sync</strong> between web app and extension</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Custom shortcuts</strong> for frequently-tracked tasks</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Feature 3: Executive Analytics Dashboard (with carousel) -->
        <div class="mb-16 rounded-lg border border-blue-500/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-blue-600 p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <TrendingUp class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Executive Analytics</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Actionable Intelligence, Not Just Dashboards
              </h3>
              <p class="mb-6 text-muted-foreground">
                Executive analytics with clickable alerts that show WHO can help, WHAT to do, and WHEN to hire.
                Real-time financial KPIs, burnout risk detection, skills gap analysis, and workload redistribution
                recommendations. This is McKinsey-level strategic workforce intelligence.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Clickable burnout alerts</strong> with redistribution recommendations</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Skills gap analysis</strong> matched to underutilized staff for training</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Financial impact calculations</strong> for unused capacity</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Hiring recommendations</strong> when &lt;3 people have critical skills</span>
                </li>
              </ul>
            </div>
            <div>
              <ImageCarousel images={analyticsImages} autoPlayInterval={3000} />
            </div>
          </div>
        </div>

        <!-- Feature 4: Visual Capacity Planning -->
        <div class="mb-16 rounded-lg border border-green-500/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div class="order-2 lg:order-1">
              <div class="rounded-lg border-2 border-green-500/20 overflow-hidden bg-muted">
                <img
                  src="/screenshots/capacity-planning.png"
                  alt="Visual Capacity Planning"
                  class="w-full h-auto"
                  loading="lazy"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                />
                <div class="hidden flex-col items-center justify-center p-12 bg-gradient-to-br from-green-500/5 to-green-500/20" style="aspect-ratio: 16/9">
                  <CalendarClock class="h-32 w-32 text-green-600 mb-6" />
                  <p class="text-lg font-semibold mb-2">Visual Capacity Planning</p>
                  <p class="text-sm text-muted-foreground">Screenshot coming soon</p>
                </div>
              </div>
            </div>
            <div class="order-1 lg:order-2">
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-green-600 p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <CalendarClock class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Resource Management</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Gradient Color-Coded Capacity Visualization
              </h3>
              <p class="mb-6 text-muted-foreground">
                Instantly see team capacity with gradient visualization: orange (critical), yellow (low),
                blue (moderate), green (optimal), red (over-allocated). Filter by category, paginate through
                large teams, and view summary metrics. Time-off approval workflows with regional compliance built-in.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Gradient color system</strong> with smooth RGB interpolation</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>One-click filters</strong> for Critical, Low, Moderate, Optimal, Over-allocated</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Time-off approval workflows</strong> with manager hierarchy</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Department-level analysis</strong> with summary metrics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Feature 5: Customizable Dropdown Lists -->
        <div class="mb-16 rounded-lg border border-orange-500/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-orange-600 p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <Layers class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Configuration</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Customizable Dropdown Lists - No Hardcoding Required
              </h3>
              <p class="mb-6 text-muted-foreground">
                Stop begging developers to add dropdown options. Admins can manage all dropdown lists directly
                from the UI—industries, project types, skill categories, departments, and more. Add, edit,
                reorder, or remove options instantly without touching code. Your platform adapts to your
                organization's needs, not the other way around.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Admin-managed dropdowns</strong> for industries, project types, skills, departments</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Drag-and-drop reordering</strong> to prioritize options as needed</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Instant updates</strong> across the entire platform with no code changes</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Self-service configuration</strong> means faster changes and less IT dependency</span>
                </li>
              </ul>
            </div>
            <div class="rounded-lg border-2 border-orange-500/20 overflow-hidden bg-muted">
              <img
                src="/screenshots/dropdown-management.png"
                alt="Customizable Dropdown Lists Management"
                class="w-full h-auto"
                loading="lazy"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
              />
              <div class="hidden flex-col items-center justify-center p-12 bg-gradient-to-br from-orange-500/5 to-orange-500/20" style="aspect-ratio: 16/9">
                <Layers class="h-32 w-32 text-orange-600 mb-6" />
                <p class="text-lg font-semibold mb-2">Dropdown Lists Management</p>
                <p class="text-sm text-muted-foreground">Screenshot coming soon</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature 6: Leave Request Approval Workflow -->
        <div class="mb-16 rounded-lg border border-indigo-500/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div class="order-2 lg:order-1">
              <div>
                <ImageCarousel images={leaveRequestImages} autoPlayInterval={3000} />
              </div>
            </div>
            <div class="order-1 lg:order-2">
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-indigo-600 p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <CalendarClock class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Capacity Planning</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Leave Request Approval - Avoid Blind Spots in Capacity Planning
              </h3>
              <p class="mb-6 text-muted-foreground">
                Stop being blindsided by surprise time-off requests. Integrated leave management with manager
                approval workflows ensures every vacation, sick day, and personal appointment is visible in your
                capacity planning. When you know who's out and when, you can staff projects proactively instead
                of scrambling to backfill at the last minute. Regional compliance built-in for different leave
                policies across locations.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Manager approval workflows</strong> with hierarchical routing and notifications</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Automatic capacity adjustments</strong> when leave is approved—no manual updates</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Regional compliance</strong> with different leave types and policies per location</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Calendar integration</strong> shows time-off alongside project deadlines and workload</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Feature 7: Time Card API Export -->
        <div class="rounded-lg border border-emerald-500/10 bg-white dark:bg-gray-900 p-6 shadow-lg">
          <div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <div class="mb-6 flex items-center gap-3 rounded-lg bg-emerald-600 p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                  <FileJson class="h-6 w-6 text-white" />
                </div>
                <h4 class="text-lg font-semibold uppercase tracking-wide text-white">Enterprise Integration</h4>
              </div>
              <h3 class="mb-4 text-2xl font-bold sm:text-3xl">
                Time Card API Export for Payroll Systems
              </h3>
              <p class="mb-6 text-muted-foreground">
                Export time card data directly to Workday, PeopleSoft, or any payroll system via secure REST API.
                Get everything from high-level summaries to granular session details—all the data you need for
                accurate payroll processing and financial reporting. International-ready with proper timezone handling
                and UTC timestamps.
              </p>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Comprehensive data export</strong> with summary totals AND detailed session breakdowns</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Secure API key authentication</strong> with SHA-256 hashing and audit logging</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>International timezone support</strong> with employee timezone metadata included</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span><strong>Billable vs. non-billable tracking</strong> with client, project, and task details</span>
                </li>
              </ul>
              <div class="mt-6">
                <Button
                  on:click={() => showPayloadModal = true}
                  class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <FileJson class="mr-2 h-4 w-4" />
                  View Sample Payload
                </Button>
              </div>
            </div>
            <div class="rounded-lg border-2 border-emerald-500/20 overflow-hidden bg-gradient-to-br from-emerald-500/5 to-emerald-500/20 p-12">
              <div class="flex flex-col items-center justify-center text-center">
                <FileJson class="h-32 w-32 text-emerald-600 mb-6" />
                <h4 class="text-2xl font-bold mb-3">Complete Data Export</h4>
                <p class="text-muted-foreground mb-6">
                  From executive summaries to session-level details—everything your payroll system needs.
                </p>
                <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div class="rounded-lg bg-white dark:bg-gray-800 p-4">
                    <div class="text-3xl font-bold text-emerald-600 mb-1">Summary</div>
                    <div class="text-sm text-muted-foreground">Daily totals</div>
                  </div>
                  <div class="rounded-lg bg-white dark:bg-gray-800 p-4">
                    <div class="text-3xl font-bold text-emerald-600 mb-1">Details</div>
                    <div class="text-sm text-muted-foreground">Session logs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Time Card API Payload Modal -->
    <Modal bind:open={showPayloadModal} title="Time Card API Response Example" size="lg">
      <div class="space-y-4">
        <div class="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
          <AlertTriangle class="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-amber-900 dark:text-amber-100 mb-1">For Enterprise Integrations Only</p>
            <p class="text-amber-800 dark:text-amber-200">
              This is technical data for integrating with external payroll systems like Workday or PeopleSoft.
              Regular users don't need to worry about this—your time tracking "just works."
            </p>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold">What You Get:</h4>
            <a
              href="https://github.com/dtsoden/pmo/blob/main/docs/TIME-CARD-API.md"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Full API Documentation
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
          <ul class="space-y-1 text-sm text-muted-foreground mb-4">
            <li class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-primary" />
              <strong>User information</strong> with employee ID and timezone
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-primary" />
              <strong>Daily summaries</strong> showing total and billable hours
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-primary" />
              <strong>Session details</strong> with client, project, task, timestamps, and descriptions
            </li>
          </ul>
        </div>

        <div class="rounded-lg bg-gray-900 p-4 overflow-x-auto">
          <pre class="text-xs text-green-400 font-mono"><code>{`[
  {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "employeeId": "EMP-12345",
      "timezone": "America/New_York"
    },
    "summary": [
      {
        "date": "2025-11-24",
        "totalHours": 8.5,
        "billableHours": 7.0
      }
    ],
    "details": [
      {
        "date": "2025-11-24",
        "sessions": [
          {
            "client": {
              "id": "client-uuid",
              "name": "Acme Corp",
              "salesforceAccountId": "SF-12345"
            },
            "project": {
              "id": "project-uuid",
              "name": "Website Redesign",
              "code": "WEB-001"
            },
            "task": {
              "id": "task-uuid",
              "title": "Build homepage"
            },
            "startTime": "2025-11-24T14:00:00.000Z",
            "endTime": "2025-11-24T17:30:00.000Z",
            "duration": 3.5,
            "isBillable": true,
            "description": "Implemented responsive design"
          }
        ]
      }
    ]
  }
]`}</code></pre>
        </div>

        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Database class="h-4 w-4" />
          <span>All timestamps in UTC. Employee timezone included for accurate conversion.</span>
        </div>
      </div>
    </Modal>

    <!-- Value Proposition -->
    <section class="border-b bg-sky-50 dark:bg-sky-900/20">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto max-w-4xl text-center">
          <h2 class="mb-6 text-3xl font-bold sm:text-4xl">
            A Professional Solution, Built for Enterprises
          </h2>
          <p class="mb-12 text-lg text-muted-foreground">
            PMO Platform delivers everything you need to run a professional services organization
            or internal PMO—without the enterprise licensing nightmares.
          </p>
          <div class="grid gap-8 text-left md:grid-cols-2">
            <div class="flex gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Database class="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 class="mb-2 text-xl font-semibold">You Own the Platform</h3>
                <p class="text-muted-foreground">
                  Deploy on your infrastructure. Customize the code. Keep your data secure. No
                  vendor control, no data extraction fees, no surprises.
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck class="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 class="mb-2 text-xl font-semibold">Free for In-House Use</h3>
                <p class="text-muted-foreground">
                  Use it internally forever, at no cost. Modify it to fit your processes. Only pay
                  licensing fees if you want to resell it as a product.
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Zap class="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 class="mb-2 text-xl font-semibold">Real-Time Everything</h3>
                <p class="text-muted-foreground">
                  WebSocket-powered live updates. Timer syncs across devices. Notifications arrive
                  instantly. No refresh required.
                </p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Code class="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 class="mb-2 text-xl font-semibold">Modern Tech Stack</h3>
                <p class="text-muted-foreground">
                  Built with TypeScript, Node.js, SvelteKit, and PostgreSQL. Clean architecture,
                  well-documented, and ready to extend.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Core Features Grid -->
    <section class="border-b bg-background">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto mb-16 max-w-3xl text-center">
          <h2 class="mb-4 text-3xl font-bold sm:text-4xl">Everything You Need, Integrated</h2>
          <p class="text-lg text-muted-foreground">
            Stop duct-taping together multiple tools. PMO Platform gives you a complete,
            integrated system from day one.
          </p>
        </div>
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <!-- Project Management -->
          <Card class="p-6">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban class="h-6 w-6 text-primary" />
            </div>
            <h3 class="mb-2 text-xl font-semibold">Complete Project Management</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Full project hierarchy with phases, milestones, and tasks. Dependencies, status
              tracking, budget management, and variance analysis.
            </p>
            <ul class="space-y-1 text-sm text-muted-foreground">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Multi-phase project structures
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Task dependencies and blockers
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Budget hours and cost tracking
              </li>
            </ul>
          </Card>

          <!-- Capacity Planning -->
          <Card class="p-6">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CalendarClock class="h-6 w-6 text-primary" />
            </div>
            <h3 class="mb-2 text-xl font-semibold">Intelligent Capacity Planning</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Know exactly who's available and when. Prevent overbooking. Track time-off requests
              with approval workflows. Regional compliance built-in.
            </p>
            <ul class="space-y-1 text-sm text-muted-foreground">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Real-time availability tracking
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Time-off approval workflows
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Utilization and over-allocation alerts
              </li>
            </ul>
          </Card>

          <!-- Time Tracking -->
          <Card class="p-6">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Timer class="h-6 w-6 text-primary" />
            </div>
            <h3 class="mb-2 text-xl font-semibold">Integrated Time Tracking</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Real-time timer with Chrome extension. Track billable vs. non-billable hours.
              Generate daily, weekly, and monthly reports. Sync across all devices.
            </p>
            <ul class="space-y-1 text-sm text-muted-foreground">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Active timer with live sync
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Chrome extension support
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Billable hour tracking and reports
              </li>
            </ul>
          </Card>

          <!-- Analytics & Reporting -->
          <Card class="p-6">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileBarChart class="h-6 w-6 text-primary" />
            </div>
            <h3 class="mb-2 text-xl font-semibold">Advanced Analytics</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Real-time dashboards, project summaries, team utilization reports, and margin
              analysis. Clickable alerts with actionable recommendations.
            </p>
            <ul class="space-y-1 text-sm text-muted-foreground">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Clickable burnout risk alerts
              </li>
              <li class="flex items-start gap-3">
                <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span><strong>Skills gap analysis</strong> matched to real project demands</span>
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Team utilization metrics
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Budget vs. actual variance
              </li>
            </ul>
          </Card>

          <!-- Team & Resource Management -->
          <Card class="p-6">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users class="h-6 w-6 text-primary" />
            </div>
            <h3 class="mb-2 text-xl font-semibold">Team & Resource Management</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Organize teams, assign roles, manage skills. 7-tier RBAC from viewer to super admin.
              Manager hierarchies and approval workflows.
            </p>
            <ul class="space-y-1 text-sm text-muted-foreground">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                7-level role-based access control
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Skills and department tracking
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Team-level project assignments
              </li>
            </ul>
          </Card>

          <!-- Client Management -->
          <Card class="p-6">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 class="h-6 w-6 text-primary" />
            </div>
            <h3 class="mb-2 text-xl font-semibold">Client & Opportunity Tracking</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Manage clients, contacts, and sales opportunities. Salesforce integration ready.
              Track from prospect to active client to project delivery.
            </p>
            <ul class="space-y-1 text-sm text-muted-foreground">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Full client and contact management
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Opportunity pipeline tracking
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-primary" />
                Salesforce sync placeholders
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </section>

    <!-- Additional Capabilities -->
    <section class="border-b bg-sky-50 dark:bg-sky-900/20">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto mb-12 max-w-3xl text-center">
          <h2 class="mb-4 text-3xl font-bold sm:text-4xl">Enterprise-Grade Capabilities</h2>
          <p class="text-lg text-muted-foreground">
            Features you'd expect from premium SaaS platforms, without the premium price tag.
          </p>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <Zap class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Real-Time WebSocket Sync</h3>
            <p class="text-sm text-muted-foreground">
              Live updates across all users and devices. No refresh required.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <Lock class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Complete Audit Trails</h3>
            <p class="text-sm text-muted-foreground">
              Every action logged with IP tracking and change history.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <UserCheck class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Approval Workflows</h3>
            <p class="text-sm text-muted-foreground">
              Time-off requests, project approvals, manager-based authorization.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <Network class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Multi-Region Support</h3>
            <p class="text-sm text-muted-foreground">
              Timezones, regional hour limits, and compliance features.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <TrendingUp class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Utilization Analytics</h3>
            <p class="text-sm text-muted-foreground">
              Know exactly how your teams are allocated and where capacity exists.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <Layers class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Task Dependencies</h3>
            <p class="text-sm text-muted-foreground">
              Map relationships between tasks to prevent blockers.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <GitBranch class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Soft Delete Recovery</h3>
            <p class="text-sm text-muted-foreground">
              Deleted items can be restored. Permanent deletion requires admin.
            </p>
          </div>
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-semibold">Session Management</h3>
            <p class="text-sm text-muted-foreground">
              JWT auth, session tracking, and admin-level session control.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Industries -->
    <section class="border-b bg-background">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto mb-12 max-w-3xl text-center">
          <h2 class="mb-4 text-3xl font-bold sm:text-4xl">Built for Professional Services</h2>
          <p class="text-lg text-muted-foreground">
            Any organization that delivers projects, manages teams, and needs to track capacity
            and costs.
          </p>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card class="p-6 text-center">
            <div class="mb-3 flex justify-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase class="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 class="mb-2 font-semibold">Consulting Firms</h3>
            <p class="text-sm text-muted-foreground">
              Track client projects, billable hours, and consultant utilization.
            </p>
          </Card>
          <Card class="p-6 text-center">
            <div class="mb-3 flex justify-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Code class="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 class="mb-2 font-semibold">Development Agencies</h3>
            <p class="text-sm text-muted-foreground">
              Manage sprints, track developer hours, and deliver projects on time.
            </p>
          </Card>
          <Card class="p-6 text-center">
            <div class="mb-3 flex justify-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Rocket class="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 class="mb-2 font-semibold">Internal PMOs</h3>
            <p class="text-sm text-muted-foreground">
              Coordinate enterprise initiatives across departments and teams.
            </p>
          </Card>
          <Card class="p-6 text-center">
            <div class="mb-3 flex justify-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Heart class="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 class="mb-2 font-semibold">Service Organizations</h3>
            <p class="text-sm text-muted-foreground">
              Any team delivering projects to internal or external customers.
            </p>
          </Card>
        </div>
      </div>
    </section>

    <!-- Licensing & Pricing -->
    <section class="border-b bg-sky-50 dark:bg-sky-900/20">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto max-w-4xl">
          <div class="mb-8 text-center">
            <h2 class="mb-4 text-3xl font-bold sm:text-4xl">Simple, Transparent Licensing</h2>
            <p class="mb-6 text-lg text-muted-foreground">
              We believe enterprises should own their tools, not rent them forever.
            </p>
            <div class="flex justify-center">
              <Button
                href="https://github.com/dtsoden/pmo"
                size="lg"
                class="min-w-[240px]"
              >
                <Download class="mr-2 h-5 w-5" />
                Download from GitHub
              </Button>
            </div>
          </div>
          <Card class="border-2 border-primary/20 p-8 sm:p-12">
            <div class="grid gap-8 md:grid-cols-2">
              <div>
                <h3 class="mb-4 text-2xl font-bold">Free for In-House Use</h3>
                <ul class="space-y-3">
                  <li class="flex items-start gap-3">
                    <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Deploy on your infrastructure (cloud or on-premise)</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Unlimited users and projects</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Full access to source code</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Customize and extend as needed</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Keep all your data on your servers</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>No per-seat fees, ever</span>
                  </li>
                </ul>
              </div>
              <div class="flex flex-col justify-between">
                <div>
                  <h3 class="mb-4 text-2xl font-bold">Commercial Licensing Available</h3>
                  <p class="mb-4 text-muted-foreground">
                    Only required if you plan to resell or redistribute this platform as your own
                    product.
                  </p>
                  <ul class="space-y-3">
                    <li class="flex items-start gap-3">
                      <div class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground" />
                      <span>White-label redistribution</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <div class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground" />
                      <span>SaaS offering to external customers</span>
                    </li>
                    <li class="flex items-start gap-3">
                      <div class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground" />
                      <span>OEM partnerships</span>
                    </li>
                  </ul>
                </div>
                <p class="mt-6 text-sm text-muted-foreground">
                  In-house use by your employees and contractors is always free, no matter the
                  size of your organization.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="bg-background">
      <div class="container mx-auto px-4 py-16 sm:py-24">
        <div class="mx-auto max-w-3xl text-center">
          <h2 class="mb-6 text-3xl font-bold sm:text-4xl">
            Stop paying per seat. Start owning your platform.
          </h2>
          <p class="mb-8 text-lg text-muted-foreground">
            Deploy PMO Platform on your infrastructure and take control of your project management,
            resource planning, and time tracking. No trials, no credit cards, no catch.
          </p>
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              href="https://github.com/dtsoden/pmo"
              size="lg"
              class="min-w-[240px]"
            >
              <Download class="mr-2 h-5 w-5" />
              Download from GitHub
            </Button>
            <Button href="/login" variant="outline" size="lg" class="min-w-[200px]">
              Sign In
              <ArrowRight class="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p class="mt-8 text-sm text-muted-foreground">
            Questions about deployment or licensing? Contact us at{' '}
            <a href="mailto:support@example.com" class="text-primary hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t bg-background py-8">
      <div class="container mx-auto px-4">
        <div class="flex flex-col items-center gap-6">
          <!-- Logo -->
          <img
            src="/logo.png"
            alt="PMO Platform Logo"
            class="h-12 w-auto opacity-80"
            loading="lazy"
          />

          <div class="flex items-center gap-4">
            <a
              href="https://github.com/dtsoden/pmo"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground transition-colors hover:text-primary"
              aria-label="View source on GitHub"
            >
              <Github class="h-6 w-6" />
            </a>
          </div>
          <p class="text-center text-sm text-muted-foreground">
            PMO Platform - Made with passion by{' '}
            <a
              href="https://davidsoden.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              David Soden
            </a>
            {' '}© {year}
          </p>
        </div>
      </div>
    </footer>
  </div>
{/if}
