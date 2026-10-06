/**
 * Converts bytes amount into human readably string
 *
 * @example
 * humanFileSize(1024); // 1KB
 *
 * @replaces the `units = ['KB', 'MB', 'GB']` loop or `Math.log(bytes) / Math.log(1024)` index — the log version
 * breaks on `0` and negatives unless guarded, and the loop shows `1024.0 KB` at unit boundaries; `humanFileSize`
 * rolls over (`1048575` → `1.0 MB`). Caveats: values under 1 KiB come out as KB (`500` → `0.5 KB`, ignoring
 * `withSpace`), and the base is 1024 but labelled KB/MB, not KiB/MiB.
 * @detect `['"]KB['"],\s*['"]MB['"],\s*['"]GB['"]`
 * @detect `['"]KiB['"],\s*['"]MiB['"],\s*['"]GiB['"]`
 * @detect `Math\.log\(\w+\)\s*[/]\s*Math\.log\((1024|1000|k)\)`
 * @replaces `(bytes / 1024 / 1024).toFixed(1) + ' MB'` — `humanFileSize` picks the unit for the size instead of
 * a fixed MB, so small and huge values stay readable. Same 1024 base and KB/MB labels as above.
 * @detect `[/]\s*1024\s*[/]\s*1024\b`
 * @detect `[/]\s*\(\s*1024\s*\*\s*1024\s*\)`
 *
 * @group Files
 */
export function humanFileSize(
  bytes: number,
  digits: number = 1,
  withSpace: boolean = true,
): string {
  const thresh = 1024;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  if (Math.abs(bytes) < thresh) {
    return (bytes / thresh).toFixed(digits) + ` ${units[0]}`;
  }

  let u = -1;
  const r = 10 ** digits;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(digits) + (withSpace ? ' ' : '') + units[u];
}
