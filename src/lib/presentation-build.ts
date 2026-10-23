export const presentationBuild = {
  revision: process.env.NEXT_PUBLIC_PRESENTATION_BUILD_REVISION || 'unavailable',
  target: process.env.NEXT_PUBLIC_PRESENTATION_BUILD_TARGET || 'Unknown build target',
};
