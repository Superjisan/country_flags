import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';

const css = (await Deno.readTextFile(new URL('../styles.css', import.meta.url)))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  body: body.trim(),
}));

const declaration = (body, property) => {
  const match = body.match(new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`));
  return match ? match[1].trim() : null;
};

Deno.test('the answer input spans exactly what submit and skip span together', () => {
  const wideButton = rules.find((rule) =>
    rule.selector === '#buttons-div > button' && /max-width:\s*[\d.]+rem/.test(rule.body));
  const buttonRow = rules.find((rule) => rule.selector === '#buttons-div' && declaration(rule.body, 'gap'));
  const wideInput = rules.find((rule) => rule.selector === '#input-div' && /min\(100%/.test(rule.body));

  assert(wideButton, 'the wide layout still needs a capped button width');
  assert(buttonRow, '#buttons-div still needs a gap between the two buttons');
  assert(wideInput, '#input-div needs a width matching that button row');

  const buttonWidth = parseFloat(declaration(wideButton.body, 'max-width'));
  const gap = parseFloat(declaration(buttonRow.body, 'gap'));
  const inputWidth = parseFloat(declaration(wideInput.body, 'width').match(/min\(100%,\s*([\d.]+)rem/)[1]);

  assertEquals(inputWidth, buttonWidth * 2 + gap);
});

Deno.test('the answer input is beveled and reads larger than the body text', () => {
  const answer = rules.find((rule) => rule.selector === '#answer');
  assert(answer, 'styles.css needs an #answer rule');

  assertMatch(answer.body, /box-shadow:[^;]*inset/);
  assert(parseFloat(declaration(answer.body, 'border')) >= 2, 'the bevel needs a visible border');
  assert(parseFloat(declaration(answer.body, 'font-size')) > 1, 'the typed answer should read larger than 1rem');
  assertEquals(declaration(answer.body, 'width'), '100%', 'the input fills its wrapper rather than a fixed width');
});
