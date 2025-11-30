# How to Add a Carousel (Simple)

## Step 1: Add images to folder
Save images to: `frontend/static/screenshots/`

Example:
- `capacity-planning.png`
- `capacity-planning-2.png`
- `capacity-planning-3.png`

## Step 2: Add array to +page.svelte (top of script)

```javascript
const capacityImages = [
  { src: '/screenshots/capacity-planning.png', alt: 'Capacity Planning Overview' },
  { src: '/screenshots/capacity-planning-2.png', alt: 'Capacity Filters' },
  { src: '/screenshots/capacity-planning-3.png', alt: 'Capacity Summary' }
];
```

## Step 3: Use carousel in template

```html
<ImageCarousel images={capacityImages} autoPlayInterval={3000} />
```

## That's it.

## Clear Browser Cache After Adding Images

**Chrome/Edge:**
1. F12 (DevTools)
2. Right-click the refresh button
3. Click "Empty Cache and Hard Reload"

OR

1. Ctrl + Shift + Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Ctrl + Shift + R to hard refresh
