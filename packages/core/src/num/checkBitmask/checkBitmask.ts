export function checkBitmask(scope: number, flag: number): boolean;
export function checkBitmask(scope: bigint, flag: bigint): boolean;

export function checkBitmask(scope: any, flag: any): boolean {
  return (scope & flag) === flag;
}
