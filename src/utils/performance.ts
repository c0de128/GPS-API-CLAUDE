// Performance optimization utilities

/**
 * Debounce function to limit how often a function can be executed
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func.apply(context, args)
      timeout = null
    }, wait)
  }
}

/**
 * Throttle function to ensure function is called at most once in a specified period
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Memoize function results to avoid expensive recalculations
 * @param func Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = func(...args)
    cache.set(key, result)

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }

    return result
  }) as T
}

/**
 * Request animation frame wrapper for smooth animations
 * @param callback Callback function
 * @returns Cancel function
 */
export function rafSchedule(callback: (...args: any[]) => void): {
  (...args: any[]): void
  cancel: () => void
} {
  let rafId: number | null = null
  let lastArgs: any[] = []

  const scheduled = (...args: any[]) => {
    lastArgs = args

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null
        callback(...lastArgs)
      })
    }
  }

  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return Object.assign(scheduled, { cancel })
}

/**
 * Batch updates to reduce React re-renders
 * @param updates Array of update functions
 */
export function batchUpdates(updates: (() => void)[]): void {
  Promise.resolve().then(() => {
    updates.forEach(update => update())
  })
}

/**
 * Check if device has low memory
 * @returns Boolean indicating low memory
 */
export function isLowMemory(): boolean {
  if ('memory' in navigator) {
    const memory = (navigator as any).memory
    if (memory?.usedJSHeapSize && memory?.jsHeapSizeLimit) {
      const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit
      return usage > 0.9 // 90% memory usage
    }
  }
  return false
}

/**
 * Get device performance capabilities
 * @returns Performance info
 */
export function getDevicePerformance(): {
  cores: number
  memory: number | null
  connection: string | null
} {
  return {
    cores: navigator.hardwareConcurrency || 1,
    memory: 'deviceMemory' in navigator ? (navigator as any).deviceMemory : null,
    connection: 'connection' in navigator ? (navigator as any).connection?.effectiveType : null
  }
}

/**
 * Lazy load a component or module
 * @param importFunc Import function
 * @returns Promise with the module
 */
export async function lazyLoad<T>(importFunc: () => Promise<T>): Promise<T> {
  // Add delay for better UX on fast connections
  const [module] = await Promise.all([
    importFunc(),
    new Promise(resolve => setTimeout(resolve, 300))
  ])
  return module
}