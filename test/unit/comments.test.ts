import { describe, expect, it } from 'vitest';
import { classifyLines, countCodeLines } from '../../src/core/comments.js';

describe('countCodeLines — the canonical 200-line measure', () => {
  it('ignores blank lines and line comments', () => {
    const src = ['// header', '', 'const a = 1;', '  ', '# hashy', 'const b = 2;'].join('\n');
    expect(countCodeLines(src)).toBe(2);
  });

  it('ignores block comments across lines', () => {
    const src = ['/*', ' * doc', ' */', 'run();', '"""', 'python docstring', '"""', 'go();'].join('\n');
    expect(countCodeLines(src)).toBe(2);
  });

  it('counts a line of real code with a trailing intent', () => {
    expect(countCodeLines('const x = 1; // set x')).toBe(1);
  });

  it('classifies each line kind', () => {
    const kinds = classifyLines('code()\n// c\n\n');
    expect(kinds[0]).toMatchObject({ blank: false, comment: false });
    expect(kinds[1]).toMatchObject({ comment: true });
    expect(kinds[2]).toMatchObject({ blank: true });
  });
});
