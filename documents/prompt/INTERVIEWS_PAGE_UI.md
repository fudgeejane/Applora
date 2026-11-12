# Interviews Page Calendar UI/UX Refinement

Improve the Interviews page in `src/pages/app/InterviewsPage.jsx` so it is easier to understand and navigate from a user's perspective. Focus this change on the calendar controls and visual clarity; do not rewrite interview management or change unrelated pages.

## Review the existing experience first

- Inspect the current Interviews page, its supporting components and styles, and nearby application pages to follow the project's layout, typography, color, responsive, and dark-mode conventions.
- Trace the calendar controls and date-navigation behavior before editing. Identify which controls change the calendar view, which navigate dates, and which actions are needed to schedule or inspect an interview.
- Consider the page as a user: make the current calendar period immediately understandable, make previous/next navigation predictable, and reduce decorative visual noise without hiding useful actions.

## Calendar navigation goals

- Keep the calendar in a month view; remove the Today and Week viewing options and any view-switching UI that offers those modes.
- Place the displayed month and year between the previous-month and next-month navigation buttons, with the period label visually centered and easy to scan.
- Make the previous and next controls move exactly one month at a time and update the centered month/year label and calendar dates together.
- Keep the calendar readable and usable on narrow screens. Ensure the navigation controls remain easy to reach and do not cause horizontal overflow.
- Reduce distracting, nonessential icon decoration. Keep icons that communicate an action, but use them sparingly and provide clear accessible names for icon-only buttons.
- Preserve a clear visual indication of the current date within the month calendar, without presenting it as a separate calendar-view mode.

## Preserve existing behavior

- Preserve interview scheduling, editing, deletion, event selection, interview details, and any existing date-related behavior not explicitly removed above.
- Keep existing application/interview data, API contracts, routing, authentication, and backend behavior unchanged.
- Retain the current loading, empty, and error states and keep the page usable in light and dark modes.
- Follow existing accessibility patterns: semantic buttons, descriptive accessible names, visible keyboard focus, and appropriate keyboard interaction.
- Do not add dependencies, introduce new features, or make unrelated visual or functional changes.

## Implementation and verification

- Make the smallest complete change that delivers the simplified month calendar experience.
- Use the project's existing components, styling approach, and shared conventions where practical.
- Verify that the page builds and passes the most relevant existing lint or tests.
- Check that previous/next navigation updates the month and year correctly across year boundaries, that Today/Week view options are no longer available, and that interview scheduling and event interactions still work.
- Check keyboard accessibility, narrow-screen layout, and light/dark appearance where the page can be previewed.
- Summarize the changes and checks performed, and report any verification that could not be completed.
