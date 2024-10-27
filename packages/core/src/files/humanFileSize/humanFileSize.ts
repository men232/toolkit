/**
 * Converts bytes amount into human readably string
 *
 * @example
 * humanFileSize(1024); // 1KB
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
