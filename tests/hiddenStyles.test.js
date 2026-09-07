import { assert, assertEquals } from 'jsr:@std/assert@1';

const css = (await Deno.readTextFile(new URL('../styles.css', import.meta.url)))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  body: body.trim(),
}));

// Every container the game hides by setting `element.hidden`. Anything here
// that also carries its own `display` in the stylesheet stays on screen unless
// a rule outranks that display, because an id or class selector beats the
// browser's built-in `[hidden] { display: none }`.
const HIDDEN_BY_THE_GAME = [
  '#flag-container',
  '#input-div',
  '#buttons-div',
  '.mode-toggle',
  '.rating-buttons',
  '#continent-buttons',
  '#study-controls',
  '#answers-table',
  '#score',
  '#progress',
  '#country-flag',
  '#share',
  '#replay',
];

Deno.test('styles.css hides every element carrying the hidden attribute', () => {
  const globalHiddenRule = rules.find((rule) => rule.selector === '[hidden]');
  assert(globalHiddenRule, 'styles.css needs a bare [hidden] rule');
  assert(
    /display:\s*none\s*!important/.test(globalHiddenRule.body),
    '[hidden] must declare display: none !important, or id and class rules outrank it'
  );
});

Deno.test('no rule outranks [hidden] by forcing a display of its own', () => {
  const offenders = rules
    .filter((rule) => {
      const forcedDisplay = rule.body.match(/display:\s*([^;!]+?)\s*!important/);
      return forcedDisplay !== null && forcedDisplay[1] !== 'none';
    })
    .map((rule) => rule.selector);

  assertEquals(offenders, [], 'these selectors would keep a hidden element on screen');
});

Deno.test('the containers the game hides really do set a display of their own', () => {
  const setsOwnDisplay = HIDDEN_BY_THE_GAME.filter((selector) =>
    rules.some((rule) =>
      rule.selector.split(',').map((part) => part.trim()).includes(selector) &&
      /display:/.test(rule.body)
    )
  );

  assert(
    setsOwnDisplay.length > 0,
    'nothing sets its own display any more -- if that is deliberate, this guard can go'
  );
});
