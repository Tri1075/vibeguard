/** Which files are "code" — shared by the gates that only make sense on source. */

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|php|c|cc|cpp|h|hpp|cs|swift|kt|scala|sh|bash)$/;

export function isCodeFile(file: string): boolean {
  return CODE_EXT.test(file);
}
