const rndCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
const charactersLength = rndCharacters.length;

export function randomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += rndCharacters.charAt(
      Math.floor(Math.random() * charactersLength),
    );
  }
  return result;
}
