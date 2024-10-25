const rndCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
const charactersLength = rndCharacters.length;

/**
 * Generate a random string with provided length
 *
 * @group Strings
 */
export function randomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += rndCharacters.charAt(
      Math.floor(Math.random() * charactersLength),
    );
  }
  return result;
}
