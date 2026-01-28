
// In-memory pools
let malePool: string[] = [];
let femalePool: string[] = [];

/**
 * Initializes the name pools with data fetched from the backend.
 * Shuffles the names to ensure randomness.
 */
export function initializeNamePool(data: { male: string[], female: string[] }) {
  const shuffle = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };
  
  malePool = [...data.male];
  femalePool = [...data.female];
  
  shuffle(malePool);
  shuffle(femalePool);
  console.log(`Initialized Name Pools: ${malePool.length} Male, ${femalePool.length} Female`);
}

/**
 * Returns a unique, valid Tamil first name from the local pool.
 * Throws an error if the pool is exhausted to prevent duplicates.
 */
export async function getUniqueTamilFirstName(gender: 'male' | 'female' = 'male'): Promise<string> {
  const pool = gender === 'male' ? malePool : femalePool;
  
  if (pool.length === 0) {
    throw new Error(`Name pool exhausted for ${gender}. No more unique names available.`);
  }
  
  // Pop the name so it cannot be reused
  return pool.pop()!;
}

/**
 * Legacy stub to satisfy interface compatibility.
 * Name history is now managed by the shrinking pool itself.
 */
export function resetNameHistory() {
  // No-op: Pools are initialized at login and shrink as used.
  // We do NOT want to reset/refill them during a session to strictly enforce "no repeats".
}
