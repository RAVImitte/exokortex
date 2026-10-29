# ExoKortex one-page landing page creation prompt

## Random selection

Selected style: **Material**. Selected with PowerShell `Get-Random -InputObject $styles` from the user's 11 supplied styles, with equal weighting. Keep this result; do not reroll based on aesthetic preference.

## Creation prompt

Design and implement an impressive, responsive, one-page landing page for **ExoKortex**, an open-source tool that keeps a developer's portfolio in step with their work. The audience is developers, machine-learning practitioners, and builders whose projects move faster than their portfolio. The primary action is “Start your workspace,” linking to the existing `/login` flow. The secondary action is “See how it works,” linking to the workflow section on this page.

Use a confident, carefully composed **Material** design: tonal surfaces, meaningful elevation, generous spacing, tactile controls, and clear hierarchy. Give this product its own identity through a large, layered portfolio-update preview. Avoid a generic grid of identical feature cards. Use rounded corners according to hierarchy, shadows only to communicate elevation, and motion only for feedback. No new UI framework is necessary.

### Visual direction

- Canvas: glacier `#F4F7FC`; elevated surface: white `#FFFFFF`.
- Ink: midnight `#172B4D`; secondary text: slate `#536580`.
- Primary action: cobalt `#2459DC`; supporting tonal surface: ice `#E8EEFC`.
- Use Bahnschrift for expressive display type and Segoe UI Variable/Segoe UI for readable interface text, with local system fallbacks. No external font dependency.
- Use a fluid display heading, approximately 76px on desktop and 44px on mobile. Left-align headings and body copy, with a centered final call to action. Limit body text to readable measures.
- Use a 1200px content container, an 8px spacing rhythm, and a desktop hero with an approximately 45/55 text-to-preview split.

```text
Desktop
[ Brand                 How it works   Your control       Open workspace ]
[ Your work moves.       [ source update                        ]        ]
[ Your portfolio        [ layered portfolio preview              ]       ]
[ should too.            [ review / pull request status           ]      ]
[ explanation + CTAs                                                   ]
[       GitHub       Hugging Face       Kaggle       Google Colab       ]
[ How work becomes a portfolio update      interactive example          ]
[ Connect -> Understand -> Review -> Merge                              ]
[ Your work. Your model. Your call.       concise control guarantees     ]
[ Common questions / accessible disclosure rows                         ]
[                 Build the next thing. We'll keep up.                   ]
[ Brand                         Source code            Back to top      ]

Mobile: stack hero copy above its preview; wrap navigation; stack workflow
steps; keep touch targets at least 44px and avoid horizontal page overflow.
```

### Page content and behavior

1. **Navigation:** brand link, in-page workflow and control links, and a clear workspace link. Provide a keyboard-accessible skip link.
2. **Hero:** “Your work moves. Your portfolio should too.” Explain that ExoKortex follows project changes and drafts portfolio updates for the user to review. Present a realistic, explicitly labeled illustrative preview for a machine-learning project. Show source change, proposed portfolio copy, and the approval boundary. No fabricated customer counts, testimonials, or live activity.
3. **Sources:** GitHub, Hugging Face, Kaggle, Google Colab. Present them as supported sources, not endorsements.
4. **Workflow:** connect sources, understand meaningful changes, review the proposed update, then merge the pull request. Include a lightweight interactive example switching between a source change and a portfolio draft; clearly state that it is sample content. Announce updates to assistive technology.
5. **User control:** use your own OpenAI-compatible model key; approve before a pull request is created; merge and deploy using your own existing workflow. State the actual product behavior precisely. Do not claim free provider usage or automatic publishing.
6. **FAQ:** explain how publishing works, supported sources, model choice, and open-source availability. Use native accessible disclosures.
7. **Closing call to action and footer:** repeat the workspace action and link to the actual project repository at `https://github.com/RAVImitte/exokortex`.

### Implementation and acceptance

Use the existing React, React Router, TypeScript, and Lucide stack. Make `/` a public landing page that renders without an API or authentication request; preserve existing authentication and dashboard behavior under `/login` and the dashboard routes. Scope the landing styles to avoid changes to existing app screens. Support the existing light/dark theme setting, visible keyboard focus, reduced motion, and narrow screens. Use semantic landmarks, one h1, ordered heading levels, real links for navigation, and buttons for local actions. Avoid heavy dependencies, external asset requests, and animation libraries for static page content.

Before implementation, critique the direction: the portfolio draft is the one memorable element; surrounding sections remain quiet. Material elevation expresses the transition from source activity to a reviewable artifact, rather than serving as decoration. This product-specific narrative takes priority over a generic SaaS card layout.

Validate TypeScript, the production build, lint, and formatting. Inspect desktop and mobile rendering and exercise the preview, FAQ, navigation, and existing sign-in routing. Keep changes isolated on `UI-experiment`, based on `origin/main`.
