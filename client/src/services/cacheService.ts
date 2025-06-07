interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheResult<T> {
  data: T;
  createdAt: Date;
  fromCache: boolean;
}

/**
 * Generates a hash from any object/parameters for use as cache key
 */
const hashParams = (params: any): string => {
  const str = JSON.stringify(params, Object.keys(params).sort());

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `cache_${Math.abs(hash).toString(36)}`;
};

/**
 * Gets data from cache or executes getter function and caches the result
 * @param params - Parameters to hash for cache key
 * @param expiresAt - Date when the cache entry should expire
 * @param getter - Function to execute if cache miss or expired
 * @returns Object containing data, creation time, and cache hit status
 */
export const getOrAddCache = async <T>(
  params: any,
  expiresAt: Date,
  getter: () => Promise<T>,
): Promise<CacheResult<T>> => {
  const cacheKey = hashParams(params);
  const now = Date.now();

  try {
    // Try to get from localStorage
    const cachedItem = localStorage.getItem(cacheKey);

    if (cachedItem) {
      const parsed: CacheEntry<T> = JSON.parse(cachedItem);

      // Check if cache is still valid
      if (parsed.expiresAt > now) {
        console.log(`Cache hit for key: ${cacheKey}`);

        return {
          data: parsed.data,
          createdAt: new Date(parsed.createdAt),
          fromCache: true,
        };
      } else {
        console.log(`Cache expired for key: ${cacheKey}`);
        // Remove expired entry
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.warn(`Failed to read cache for key ${cacheKey}:`, error);
    // If parsing fails, remove the corrupted entry
    localStorage.removeItem(cacheKey);
  }

  console.log(`Cache miss for key: ${cacheKey}, fetching fresh data`);

  // Cache miss or expired, fetch fresh data
  const data = await getter();
  const createdAt = now;

  // Store in cache
  const cacheEntry: CacheEntry<T> = {
    data,
    expiresAt: expiresAt.getTime(),
    createdAt,
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

    console.log(
      `Cached data for key: ${cacheKey}, created at: ${new Date(createdAt).toISOString()}, expires at: ${expiresAt.toISOString()}`,
    );
  } catch (error) {
    console.warn(`Failed to store cache for key ${cacheKey}:`, error);
    // Continue without caching if localStorage is full or unavailable
  }

  return {
    data,
    createdAt: new Date(createdAt),
    fromCache: false,
  };
};

/**
 * Clears a specific cache entry
 */
export const clearCache = (params: any): void => {
  const cacheKey = hashParams(params);
  localStorage.removeItem(cacheKey);
  console.log(`Cleared cache for key: ${cacheKey}`);
};

/**
 * Clears all cache entries (those starting with 'cache_')
 */
export const clearAllCache = (): void => {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("cache_")) {
      localStorage.removeItem(key);
    }
  });
  console.log("Cleared all cache entries");
};

/**
 * Helper function to create an expiration date relative to now
 */
export const addHours = (hours: number): Date => {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);

  return date;
};

/**
 * Helper function to create an expiration date relative to now
 */
export const addDays = (days: number): Date => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);

  return date;
};
