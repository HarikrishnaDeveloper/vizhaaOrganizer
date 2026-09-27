import { Image } from 'expo-image';

// Every image the onboarding illustration draws. All are bundled require()
// assets, so nothing is fetched from the internet in a release build.
export const ONBOARDING_IMAGES = {
  man: require('../assets/splashscreen/man.png'),
  popper: require('../assets/splashscreen/sml_popper.png'),
  decor: require('../assets/splashscreen/decor.png'),
  food: [
    require('../assets/splashscreen/food/fp1.png'),
    require('../assets/splashscreen/food/fp2.png'),
    require('../assets/splashscreen/food/fp3.png'),
    require('../assets/splashscreen/food/fp4.png'),
    require('../assets/splashscreen/food/fp5.png'),
    require('../assets/splashscreen/food/fp6.png'),
    require('../assets/splashscreen/food/fp7.png'),
    require('../assets/splashscreen/food/fp8.png'),
    require('../assets/splashscreen/food/fp9.png'),
  ],
};

let preloadPromise = null;

// Loads and decodes every onboarding image into memory up front, so the
// illustration renders complete on its first frame instead of popping in
// piece by piece. Resolves to decoded ImageRefs with the same shape as
// ONBOARDING_IMAGES; any image that fails falls back to its plain asset
// module. Memoized, so remounts and repeat calls reuse the same result.
export const preloadOnboardingImages = () => {
  if (!preloadPromise) {
    const load = (source) => Image.loadAsync(source).catch(() => source);
    preloadPromise = Promise.all([
      load(ONBOARDING_IMAGES.man),
      load(ONBOARDING_IMAGES.popper),
      load(ONBOARDING_IMAGES.decor),
      Promise.all(ONBOARDING_IMAGES.food.map(load)),
    ]).then(([man, popper, decor, food]) => ({ man, popper, decor, food }));
  }
  return preloadPromise;
};
