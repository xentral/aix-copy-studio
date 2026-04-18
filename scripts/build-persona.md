# Building a Thought-Leader Voice

When you want a new voice beyond the built-in ones:

1. Collect 5–10 writing samples from the person:
   - LinkedIn posts (copy-paste raw text)
   - Interview transcripts
   - Blog posts
   - Slack/email excerpts (if permitted)

2. In any Claude Code session, invoke:
   `/anthropic-skills:writing-style-analyzer`

   Paste all samples. Ask for: "Produce a reusable Style Card for the product 'copy-studio'."

3. Save the output as `config/voices/<slug>.md` in the copy-studio repo:
   - First line must be `# <Display Name>` (shown in the app's voice dropdown)
   - Rest is the style card content (tone, vocab, syntax rules, hooks, what to avoid)

4. Restart dev server — new voice appears automatically.

Pro tip: match the structure of `config/voices/xentral-brand.md` for consistency (but the product doesn't enforce a schema — any markdown works).
