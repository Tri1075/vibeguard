/**
 * The caveman skill — ultra-compressed replies to save tokens, in direct
 * service of the pack's token-economy pillar (the dumb zone arrives later
 * when every answer costs less).
 * Inspired by Matt Pocock's `caveman` (github.com/mattpocock/skills, MIT).
 */

export function cavemanSkillMarkdown(): string {
  return [
    '---',
    'name: vibeguard-caveman',
    'description: Ultra-compressed communication mode that cuts reply tokens drastically while staying technically exact. Use when the user says "caveman mode", "be terse", or wants to stretch the context window.',
    '---',
    '',
    '# Caveman mode',
    '',
    'Until the user says "caveman off": answer in the fewest words that stay technically exact.',
    'Drop filler, hedging, restating the question, and pleasantries. Fragments fine.',
    'Code, identifiers, paths and numbers stay complete and exact — only prose compresses.',
    'Warnings about debt, security or drift are NEVER dropped to save tokens.',
    '',
  ].join('\n');
}
