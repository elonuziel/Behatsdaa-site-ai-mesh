/**
 * Chips Carousel & Smooth Scroll Controller for Category Bars
 * Supports RTL layout, scroll buttons, gradient indicators, mouse drag-to-scroll,
 * mouse-wheel horizontal scrolling, and expand/collapse multi-line toggle.
 */

const carousels = new Map();

/**
 * Check RTL scroll boundaries across browsers
 */
function getScrollState(container) {
  if (!container) return { canScrollLeft: false, canScrollRight: false, maxScroll: 0, isExpanded: false };

  if (container.classList.contains('flex-wrap')) {
    return { canScrollLeft: false, canScrollRight: false, maxScroll: 0, isExpanded: true };
  }

  const maxScroll = container.scrollWidth - container.clientWidth;
  if (maxScroll <= 2) {
    return { canScrollLeft: false, canScrollRight: false, maxScroll: 0, isExpanded: false };
  }

  const sl = container.scrollLeft;

  // Modern browsers (Chrome, Firefox, Safari) in RTL:
  // sl is 0 at the right edge (start), and -maxScroll at the left edge (end).
  if (sl <= 0.5) {
    const absSl = Math.abs(sl);
    const atRight = absSl <= 4;
    const atLeft = absSl >= maxScroll - 4;
    return {
      canScrollRight: !atRight,
      canScrollLeft: !atLeft,
      maxScroll,
      isExpanded: false
    };
  } else {
    // Fallback for positive RTL engines
    const atRight = sl <= 4;
    const atLeft = sl >= maxScroll - 4;
    return {
      canScrollRight: !atRight,
      canScrollLeft: !atEnd,
      maxScroll,
      isExpanded: false
    };
  }
}

/**
 * Smoothly scroll chips in a given direction
 * In RTL:
 * - 'left' reveals more categories forward
 * - 'right' scrolls backward towards "הכל"
 */
export function scrollChips(container, direction) {
  if (!container || container.classList.contains('flex-wrap')) return;
  const scrollAmount = Math.max(container.clientWidth * 0.7, 220);
  const delta = direction === 'left' ? -scrollAmount : scrollAmount;

  if (typeof container.scrollBy === 'function') {
    try {
      container.scrollBy({ left: delta, behavior: 'smooth' });
      return;
    } catch (e) {
      // ignore and fallback
    }
  }
  container.scrollLeft += delta;
}

/**
 * Update the visibility and state of scroll buttons and fade masks
 */
export function updateChipsControls(containerId) {
  const config = carousels.get(containerId);
  if (!config) return;

  const container = document.getElementById(config.containerId);
  const scrollRightBtn = document.getElementById(config.scrollRightBtnId);
  const scrollLeftBtn = document.getElementById(config.scrollLeftBtnId);
  const fadeRight = document.getElementById(config.fadeRightId);
  const fadeLeft = document.getElementById(config.fadeLeftId);

  if (!container) return;

  const state = getScrollState(container);

  if (state.isExpanded || state.maxScroll <= 2) {
    if (scrollRightBtn) {
      scrollRightBtn.disabled = true;
      scrollRightBtn.classList.add('opacity-0', 'pointer-events-none');
    }
    if (scrollLeftBtn) {
      scrollLeftBtn.disabled = true;
      scrollLeftBtn.classList.add('opacity-0', 'pointer-events-none');
    }
    if (fadeRight) fadeRight.classList.add('opacity-0');
    if (fadeLeft) fadeLeft.classList.add('opacity-0');
    return;
  }

  if (scrollRightBtn) {
    scrollRightBtn.disabled = !state.canScrollRight;
    if (state.canScrollRight) {
      scrollRightBtn.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      scrollRightBtn.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  if (scrollLeftBtn) {
    scrollLeftBtn.disabled = !state.canScrollLeft;
    if (state.canScrollLeft) {
      scrollLeftBtn.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      scrollLeftBtn.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  if (fadeRight) {
    if (state.canScrollRight) {
      fadeRight.classList.remove('opacity-0');
    } else {
      fadeRight.classList.add('opacity-0');
    }
  }

  if (fadeLeft) {
    if (state.canScrollLeft) {
      fadeLeft.classList.remove('opacity-0');
    } else {
      fadeLeft.classList.add('opacity-0');
    }
  }
}

/**
 * Auto-scroll the currently selected chip into view
 */
export function scrollActiveChipIntoView(containerId) {
  const container = document.getElementById(containerId);
  if (!container || container.classList.contains('flex-wrap')) return;

  const activeChip = container.querySelector(
    '.category-chip.bg-blue-600, .deal-category-chip.bg-emerald-600, .billing-category-chip.bg-purple-600'
  );

  if (activeChip && typeof activeChip.scrollIntoView === 'function') {
    try {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    } catch (e) {
      // ignore
    }
  }
  updateChipsControls(containerId);
}

/**
 * Toggle between single-line carousel and multi-line expanded wrap
 */
export function toggleChipsExpanded(containerId) {
  const config = carousels.get(containerId);
  if (!config) return;

  const container = document.getElementById(config.containerId);
  const expandBtn = document.getElementById(config.expandBtnId);
  if (!container || !expandBtn) return;

  const isExpanded = container.classList.contains('flex-wrap');
  const textEl = expandBtn.querySelector('.chips-expand-text');
  const iconEl = expandBtn.querySelector('.chips-expand-icon');

  if (isExpanded) {
    // Switch to single-line carousel
    container.classList.remove('flex-wrap', 'overflow-visible', 'cursor-default');
    container.classList.add('flex-nowrap', 'overflow-x-auto', 'cursor-grab');
    if (textEl) textEl.textContent = 'כל הקטגוריות';
    expandBtn.title = 'הצג את כל הקטגוריות ברשת';
    if (iconEl) iconEl.classList.remove('rotate-180');
    expandBtn.classList.remove('ring-2', 'ring-blue-400', 'ring-emerald-400', 'ring-purple-400', 'bg-blue-50', 'dark:bg-blue-950/60');
  } else {
    // Switch to multi-line wrap
    container.classList.remove('flex-nowrap', 'overflow-x-auto', 'cursor-grab', 'cursor-grabbing');
    container.classList.add('flex-wrap', 'overflow-visible', 'cursor-default');
    if (textEl) textEl.textContent = 'צמצם';
    expandBtn.title = 'צמצם לשורה אחת עם גלילה';
    if (iconEl) iconEl.classList.add('rotate-180');
    expandBtn.classList.add('ring-2', `ring-${config.accentColor || 'blue'}-400`, `bg-${config.accentColor || 'blue'}-50`);
  }

  updateChipsControls(containerId);
}

/**
 * Initialize a category chips carousel
 */
export function initChipsCarousel(config) {
  const container = document.getElementById(config.containerId);
  if (!container) return;

  carousels.set(config.containerId, config);

  const scrollRightBtn = document.getElementById(config.scrollRightBtnId);
  const scrollLeftBtn = document.getElementById(config.scrollLeftBtnId);
  const expandBtn = document.getElementById(config.expandBtnId);

  // Scroll buttons
  if (scrollRightBtn) {
    scrollRightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      scrollChips(container, 'right');
      setTimeout(() => updateChipsControls(config.containerId), 250);
    });
  }

  if (scrollLeftBtn) {
    scrollLeftBtn.addEventListener('click', (e) => {
      e.preventDefault();
      scrollChips(container, 'left');
      setTimeout(() => updateChipsControls(config.containerId), 250);
    });
  }

  // Expand / Collapse button
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleChipsExpanded(config.containerId);
    });
  }

  // Scroll listener for controls update
  container.addEventListener('scroll', () => {
    updateChipsControls(config.containerId);
  }, { passive: true });

  // Mouse wheel horizontal scroll conversion
  container.addEventListener('wheel', (e) => {
    if (container.classList.contains('flex-wrap')) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 2) {
        e.preventDefault();
        const prevSl = container.scrollLeft;
        container.scrollLeft -= e.deltaY;
        if (container.scrollLeft === prevSl && prevSl >= 0) {
          container.scrollLeft += e.deltaY;
        }
        updateChipsControls(config.containerId);
      }
    }
  }, { passive: false });

  // Mouse drag-to-scroll (grab to scroll)
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasDragged = false;

  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || container.classList.contains('flex-wrap')) return;
    isDown = true;
    hasDragged = false;
    startX = e.pageX;
    scrollStart = container.scrollLeft;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const deltaX = e.pageX - startX;
    if (Math.abs(deltaX) > 4) {
      hasDragged = true;
      container.classList.add('cursor-grabbing');
      container.classList.remove('cursor-grab');
      container.scrollLeft = scrollStart - deltaX;
      updateChipsControls(config.containerId);
    }
  });

  const stopDrag = () => {
    if (!isDown) return;
    isDown = false;
    container.classList.remove('cursor-grabbing');
    if (!container.classList.contains('flex-wrap')) {
      container.classList.add('cursor-grab');
    }
    updateChipsControls(config.containerId);
  };

  window.addEventListener('mouseup', stopDrag);

  // Suppress accidental chip selection if dragging
  container.addEventListener('click', (e) => {
    if (hasDragged) {
      e.stopImmediatePropagation();
      e.preventDefault();
      hasDragged = false;
    }
  }, true);

  // Initial update
  updateChipsControls(config.containerId);
}

/**
 * Refresh all registered carousels (e.g. on window resize or tab switch)
 */
export function updateAllChipsControls() {
  for (const containerId of carousels.keys()) {
    updateChipsControls(containerId);
  }
}

// Global window resize listener
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    updateAllChipsControls();
  });
}
