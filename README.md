# Country Flags Game

A browser-based quiz that tests your knowledge of world flags.  Pick a continent (or the whole world), and name the country each flag belongs to.  Answers autocomplete from a datalist, common alternate names are accepted (`Holland`, `USA`, `Turkey`, `DR Congo`), and once you finish a set you can share your score as a Wordle-style emoji grid via the native share sheet (or a clipboard copy on browsers without it).

It's the mirror image of [capitals_game](https://github.com/Superjisan/capitals_game), which shows the country and asks for the capital -- same architecture, same static site: plain HTML, CSS, and vanilla JS ES modules, no build step or dependencies.

## How answers are matched

An answer is correct if it matches the country's name or any of its listed aliases after normalization, which folds away case, diacritics, punctuation and spacing.  So `Türkiye`, `turkiye` and `TURKIYE` all match, as do `St. Lucia`, `St Lucia` and `saint lucia`, and `Côte d'Ivoire`, `cote divoire` and `Ivory Coast`.

Genuinely different names -- `Holland` for the Netherlands, `Turkey` for Türkiye, `Swaziland` for Eswatini -- are listed per country in the `aliases` field of [data/countries.json](data/countries.json).  Two tests in [tests/modeDatasets.test.js](tests/modeDatasets.test.js) guard that file: no name may be claimed by two different countries, and no alias may be redundant with a name that normalization already covers.

## Running it locally

This project uses native ES module imports (including JSON module imports for the country data), which browsers block under the `file://` protocol.  It needs to be served over HTTP.

The recommended way is the **Live Server** extension for VS Code:

1. Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) from the VS Code marketplace.
2. Open this folder in VS Code.
3. Right-click [index.html](index.html) and choose **Open with Live Server**, or click **Go Live** in the status bar.

Your browser opens the game automatically, and it reloads on save.

## Running the tests

Tests use [Deno](https://deno.com)'s built-in test runner with `jsdom` for DOM emulation -- no Node/npm install needed.

1. Install Deno: `brew install deno` (see [deno.com/manual/getting_started/installation](https://docs.deno.com/runtime/getting_started/installation/) for other platforms).
2. From the project root, run `deno task test`.

This runs every file under [tests/](tests/) once, headless, with no browser required.

## Where the flag images come from

Flags are loaded at runtime from [flagcdn.com](https://flagcdn.com) by ISO 3166-1 alpha-2 code.  A handful of countries with no code there (Kosovo, Palestine, Tuvalu, the Marshall Islands, Micronesia) fall back to `worldflags.net` via a `flagSlug` in the data file.  A `flagFile` path overrides both and serves a copy committed under `flags/`, for countries neither host gets right -- Afghanistan, where both still publish the pre-2021 flag.  If an image fails to load, the round shows an "unavailable" note instead of a broken image, so the player can skip.

## Deployment

The site deploys to GitHub Pages straight from the `main` branch root -- any push to `main` triggers a "pages build and deployment" run under the repo's **Actions** tab, and the live site updates automatically once it completes.  There's no separate workflow file to maintain.
