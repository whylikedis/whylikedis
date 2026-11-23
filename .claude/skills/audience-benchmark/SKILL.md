---
name: audience-benchmark
description: Read the websites of the US Israel-support and Jewish community organisations our audience already knows, and describe what they show - values, messages, sections, design and calls to action - next to our own site. Use when asked to benchmark, compare with or learn from these organisations.
---

# Benchmark the sites our audience already knows

Parents who come to WhyLikeDIs already know a handful of organisations: they give to them, read
their newsletters, send their children on their trips. This skill reads those organisations' sites
and records what they show, so our design and words can feel familiar where that helps and go
further where nobody else does.

Describe, do not judge. The point is what a visitor sees, not whether the organisation is right.

## Who to read

Read every group. Add an organisation the person names; drop none without saying why.

| Group                       | Organisations                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Israel advocacy             | AIPAC, StandWithUs, CAMERA, HonestReporting, AJC, Christians United for Israel, J Street         |
| IDF and Israel support      | Friends of the IDF, Jewish National Fund-USA, American Friends of Magen David Adom, Israel Bonds |
| Community and antisemitism  | ADL, Jewish Federations of North America, Israeli-American Council, Chabad.org                   |
| Youth, family and education | Hillel International, Birthright Israel, BBYO, PJ Library, Unpacked                              |
| Us                          | The current WhyLikeDIs site, read the same way, last                                             |

J Street is there for range: its politics differ from most of the list, and parents know it too.

## How to read a site

Use a real browser (the built-in browser pane, or Chrome when only that is available). A plain
HTTP fetch misses what scripts draw and cannot see colour or layout.

1. Open the home page. Wait three seconds. Take a screenshot.
2. Run `capture.js` (next to this file) in the browser's JavaScript tool. It returns the title,
   description, headings, navigation, coloured buttons with their colours, the background colours
   that cover the most screen, fonts, counts of images, video and forms, social networks, and a
   set of yes/no signals (donate, newsletter, events, podcast, parents, students, antisemitism…).
3. Look at the screenshot for what the script cannot see: who is in the photos, the mood, what
   the first screen asks you to do.
4. When the home page links to an explainer, a facts page, or a page for parents or children, open
   one and note its shape: length, headings, sources, media.
5. If a site shows a bot check or a sign-in wall, stop and record it as not read. Never try to get
   past one. Never fill a form, sign up or donate.

Record per site, in one short paragraph: purpose, first-screen line (paraphrased), the one action
it asks for, colours, fonts, imagery, trust signals, engagement mechanics, anything aimed at
parents.

## What to write

One report, in this order:

1. **In short.** Five numbered findings, each one sentence plus one line of evidence.
2. **What was looked at, and how.** The list, what was read, what was not and why, and limits
   (season, campaigns, desktop or mobile, date).
3. **The things nearly all of them show.** A table: element, how many sites, examples. Count from
   the captures; mark a count as approximate when it came from looking.
4. **Values and sentiments.** Grouped themes, paraphrased, with the sites behind each.
5. **Visual and design patterns.** Colour, type, imagery, layout, Jewish and Israeli marks.
6. **Engagement mechanics.** Giving, acting, joining, learning, newer technology.
7. **Who speaks to parents.** And what no one gives them.
8. **Our site, side by side.** A table: what the audience is used to, what our site does today.
9. **What this means for the design system.** What to match, and where to go further.
10. **Each organisation in one paragraph.**
11. **Next runs.**

Rules for the report:

- Quote little. Paraphrase headlines; quote a few words only when the wording is the finding.
- Say "our reading" when a sentence is a judgement and not a count or a measurement.
- Restraint and plain English, as in `AGENTS.md`.

## Where it goes

The report is a planning document, not public content. **Never commit it to this repository.**
Write it where the person keeps project files, dated, for example
`research/audience-benchmark/YYYY-MM-DD-<topic>.md`, and compare with the last run if there is
one: what changed on each site since then.
