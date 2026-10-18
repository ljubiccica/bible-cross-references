import { lazy } from 'react';
import { ReadingIcon } from '../../shared/ui/icons.tsx';
import type { Visualization } from '../visualization.ts';

// The view's code is a chunk of its own; its download starts as soon as the app lists the views.
const explorer = import('./ThreadsExplorer.tsx');

export const threads = {
  id: 'threads',
  titleKey: 'view.threads',
  shortTitleKey: 'view.threads.short',
  icon: ReadingIcon,
  openLabelKey: 'view.threads.open',
  Component: lazy(async () => ({ default: (await explorer).ThreadsExplorer })),
} as const satisfies Visualization;
