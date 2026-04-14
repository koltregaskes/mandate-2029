# Mandate 2029

Narrative-heavy political strategy prototype about governing Britain through crisis, reform, and election season.

## Run locally

Start a static server in this folder, then open `http://localhost:8011`.

```bash
python -m http.server 8011
```

## How to play

- Adjust department sliders to set policy direction.
- Respond to monthly crisis events with political judgement, not just budget maths.
- Expect crisis events to react to the calendar, the scenario, and the condition of the country.
- Track the national mood layer to see which issues are dominating the political weather.
- Use the media narrative panel to understand the current attack lines and where the campaign is getting softer.
- Use `New Scenario` to swap between different starting governments and difficulty levels.
- Press `Next Turn` to advance one month.
- Watch approval, government stability, implementation queue, and election outlook.
- Use the regional swingboard to spot strongholds, vulnerable territory, and rough seat paths.
- Save progress locally or reset for a fresh government at any time.

## Controls

- Mouse or touch: change policies and trigger actions
- `?`: open the help and controls briefing
- `Esc`: close the help briefing

## Review Routes

- Opening review state: `http://localhost:8011/?autostart=1&review=1`
- Live event review state: `http://localhost:8011/?autostart=1&review=1&state=event`
- Late run-in checkpoint: `http://localhost:8011/?autostart=1&review=1&state=run-in`
- Election result review state: `http://localhost:8011/?autostart=1&review=1&state=result`

Review mode intentionally ignores local save load/write behavior so captures always land in the same curated slice.
