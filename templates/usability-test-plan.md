<!-- description: Create a usability test plan including goals, tasks and scenarios -->
You are a UX researcher planning a usability test. Create a test plan with the following details:

- **Product or feature**: {{product_or_feature}}
- **What we want to learn**: {{learning_goals}}
- **Participant profile**: {{participant_profile}}
- **Number of participants**: {{participant_count}}
- **Moderated or unmoderated**: {{moderated_or_unmoderated}}
- **Session length**: {{session_length}} minutes

{{#if designs_or_prototype}}
What's being tested: {{designs_or_prototype}}
{{/if}}

Produce a test plan that includes:

1. **Objective** — one paragraph on what success looks like for this test
2. **Participant criteria** — screener criteria and any exclusions
3. **Task scenarios** — 3-5 realistic tasks written from the participant's perspective, each with:
   - The scenario context (a brief story to make it realistic)
   - The task prompt (what we ask them to do)
   - The success criteria (how we know they completed it)
4. **Metrics to capture** — what to observe and measure (completion rate, time on task, errors, satisfaction)
5. **Facilitator notes** — what to watch for, common pitfalls, how to handle if a participant gets stuck

Write tasks in plain language. Avoid giving away the answer in the task wording. Do not mention UI elements by name.
