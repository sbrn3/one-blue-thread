// app.json is the release app's config and stays the source of truth
// (test/brand.test.ts reads it). This file only re-badges the build when
// APP_VARIANT=development, which the "Dev client APK" workflow sets: a
// separate package, name and hazard-striped icon, so the dev client installs
// NEXT TO the release app instead of replacing it. Each keeps its own data.
// See AGENTS.md → "The owner's phone".
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;
  return {
    ...config,
    name: 'One Blue Thread (dev)',
    slug: 'thread-dev', // the dev launcher's deep link is exp+<slug>; keep it distinct from release
    scheme: 'thread-dev',
    icon: './assets/dev/icon.png',
    android: {
      ...config.android,
      package: 'com.sngugi.thread.dev',
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        foregroundImage: './assets/dev/foreground.png',
        backgroundImage: './assets/dev/background.png',
      },
    },
  };
};
