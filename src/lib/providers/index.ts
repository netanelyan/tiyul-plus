import type { PlacesProvider } from '@/lib/types';
import { sampleProvider } from './sample';
import { googleProvider } from './google';
import { tripadvisorProvider } from './tripadvisor';

/**
 * Choosing the data provider through an environment variable - swapping provider is a configuration
 * change, not a rewrite. Default: the local sample data (works with no keys).
 *
 *   NEXT_PUBLIC_PLACES_PROVIDER=sample | google | tripadvisor
 */
const providers: Record<string, PlacesProvider> = {
  sample: sampleProvider,
  google: googleProvider,
  tripadvisor: tripadvisorProvider,
};

export function getProvider(): PlacesProvider {
  const name = process.env.NEXT_PUBLIC_PLACES_PROVIDER ?? 'sample';
  return providers[name] ?? sampleProvider;
}
