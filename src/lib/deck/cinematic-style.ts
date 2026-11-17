export function lowPowerPresentation() {
  const query = new URLSearchParams(window.location.search);
  const memory = (navigator as Navigator & {deviceMemory?: number}).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return query.get('q') === 'low' || (cores > 0 && cores <= 4) || Boolean(memory && memory <= 4);
}
