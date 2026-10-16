import { translationDatasetPath } from '../core/datasets/paths.ts';
import { mount } from '../shared/lib/mount.tsx';
import { VizDataBoundary } from '../visualizations/shared/components/VizDataBoundary.tsx';
import { translationLoader, vizCoreLoader } from '../visualizations/shared/viz-data.ts';
import { Explorer } from './Explorer.tsx';
import { registerOfflineCache } from './register-offline-cache.ts';
import { initialTranslationId } from './translation-choice.ts';

// The text downloads beside the links rather than after them: which one to show is known from the
// URL (or the reader's last choice) before anything renders. The app awaits it through `use()`;
// this only starts it, so a failure is handled there.
const translation = initialTranslationId(new URL(window.location.href));
const loadingTranslation = translationLoader(translation).load();
void loadingTranslation.catch(() => undefined);

mount(<VizDataBoundary>{(core) => <Explorer core={core} />}</VizDataBoundary>);

// Once the data has loaded, the offline cache can keep it: from the HTTP cache, not the network.
// The text is named explicitly, since the worker only knows the default one — and if that one
// download is the thing that failed, the rest is still worth keeping.
Promise.allSettled([vizCoreLoader.load(), loadingTranslation]).then(
  ([core, text]) => {
    if (core.status === 'rejected') {
      return;
    }
    registerOfflineCache(text.status === 'fulfilled' ? [translationDatasetPath(translation)] : []);
  },
  () => undefined,
);
