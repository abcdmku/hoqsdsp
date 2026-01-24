import type { FilterConfig, FilterType } from '../../types';
import type { FilterHandler } from './types';
import { biquadHandler } from './biquad';
import { convolutionHandler } from './convolution';
import { delayHandler } from './delay';
import { gainHandler } from './gain';
import { volumeHandler } from './volume';
import { ditherHandler } from './dither';
import { diffeqHandler } from './diffeq';
import { compressorHandler } from './compressor';
import { loudnessHandler } from './loudness';
import { noisegateHandler } from './noisegate';

class FilterRegistry {
  private handlers = new Map<FilterType, FilterHandler>();

  register<T extends FilterConfig>(handler: FilterHandler<T>): void {
    this.handlers.set(handler.type, handler as FilterHandler);
  }

  get<T extends FilterConfig>(type: FilterType): FilterHandler<T> | undefined {
    return this.handlers.get(type) as FilterHandler<T> | undefined;
  }

  has(type: FilterType): boolean {
    return this.handlers.has(type);
  }

  getAll(): FilterHandler[] {
    return Array.from(this.handlers.values());
  }

  getAllTypes(): FilterType[] {
    return Array.from(this.handlers.keys());
  }
}

export const filterRegistry = new FilterRegistry();

// Register all handlers
filterRegistry.register(biquadHandler);
filterRegistry.register(convolutionHandler);
filterRegistry.register(delayHandler);
filterRegistry.register(gainHandler);
filterRegistry.register(volumeHandler);
filterRegistry.register(ditherHandler);
filterRegistry.register(diffeqHandler);
filterRegistry.register(compressorHandler);
filterRegistry.register(loudnessHandler);
filterRegistry.register(noisegateHandler);
