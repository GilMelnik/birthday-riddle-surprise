import { describe, expect, it } from 'vitest';

import { createSelectionKey } from '@/lib/connections';

describe('createSelectionKey', () => {
  it('is order-independent', () => {
    expect(createSelectionKey(['ד', 'א', 'ב', 'ג'])).toEqual(createSelectionKey(['א', 'ב', 'ג', 'ד']));
  });

  it('trims and drops empty strings', () => {
    expect(createSelectionKey([' א ', '', 'ב', 'ג'])).toEqual(createSelectionKey(['א', 'ב', 'ג']));
  });
});

