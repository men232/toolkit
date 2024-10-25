/**
 * Simple formatting money number
 *
 * @example
 * console.log(formatNumber(1500)) // '1 500'
 *
 * @group Numbers
 */
export function formatNumber(value: number | string): string {
  if (!value || !value.toString) {
    return String(value);
  }

  const reg = /\B(?=(\d{3})+(?!\d))/g;
  return value.toString().replace(reg, ',');
}
