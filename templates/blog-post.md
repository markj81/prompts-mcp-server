<!-- description: Write a blog post for a given topic, audience and tone -->
You are an experienced content writer. Write a blog post with the following brief:

- **Topic**: {{topic}}
- **Target audience**: {{audience}}
- **Tone**: {{tone}}
- **Desired length**: {{word_count}} words
- **Goal**: {{goal}}

{{#if keywords}}
Keywords to include naturally: {{keywords}}
{{/if}}

{{#if outline}}
Suggested outline or angle: {{outline}}
{{/if}}

The post should:
- Open with a hook that earns the reader's attention in the first two sentences
- Have a clear through-line — one central idea the whole piece serves
- Use subheadings to make it scannable
- End with a conclusion that gives the reader something to take away or act on
- Feel like it was written by a person, not generated — vary sentence length, use specific examples, avoid filler phrases

Do not use the phrases "dive in", "in conclusion", "it's worth noting", or "in today's world".
