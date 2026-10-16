import { t } from '../../locales/ui.ts';
import { lazy } from 'react';
import { ReadingIcon } from '../../shared/ui/icons.tsx';
import type { Visualization } from '../visualization.ts';

// The view's code is a chunk of its own; its download starts as soon as the app lists the views.
const explorer = import('./ThreadsExplorer.tsx');

export const threads = {
  id: 'threads',
  title: t('Threads'),
  shortTitle: t('Threads'),
  icon: ReadingIcon,
  openLabel: t('Read in context'),
  Component: lazy(async () => ({ default: (await explorer).ThreadsExplorer })),
} as const satisfies Visualization;
