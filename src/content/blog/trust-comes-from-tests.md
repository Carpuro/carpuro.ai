---
title: "You can't analyze data you don't trust"
description: "Streaming crypto market data taught me that the hard part of analytics isn't the dashboard — it's earning the right to believe the number on it."
date: 2026-05-10
tag: Engineering
---

I built a pipeline that streams cryptocurrency market data into a warehouse and turns it into
dashboards. The interesting part wasn't the streaming, and it definitely wasn't the charts. It
was everything in between — the unglamorous layer whose entire job is to let you believe what
you're looking at.

Market data is a good teacher because it's hostile. It arrives fast, it arrives out of order, it
has gaps when an exchange hiccups, and it carries the occasional impossible value — a price of
zero, a timestamp from the future, a volume that's clearly a fat-fingered API. Pipe that
straight into a dashboard and you'll get a beautiful chart of nonsense. Worse, you won't *know*
it's nonsense, because a chart looks equally confident whether or not the data underneath it is
real.

## The layer that earns trust

Between "raw feed" and "decision-ready" sits a transformation layer, and the discipline I've
landed on is to treat it as a contract, not a script.

- **Model in stages.** Raw lands untouched, in its original messy shape. A staging layer cleans
  and types it. A marts layer assembles the clean pieces into the tables people actually query.
  Each stage has one job, so when something's wrong you know which stage to look at.
- **Test the assumptions, not just the code.** Every claim I'm relying on becomes an assertion:
  this column is never null, this id is unique, this price is positive, this category is one of a
  known set. dbt runs those tests on every build. A test that fails is the pipeline telling you a
  belief you held about the data is no longer true — which is exactly when you want to find out.
- **Document as you go.** A modeled table nobody understands is only marginally better than raw
  data. The descriptions live next to the models, so the warehouse explains itself.

## Why this is the actual product

It's tempting to think the dashboard is the deliverable. It isn't. The deliverable is
*justified confidence* — the ability for someone to act on a number without privately wondering
whether it's real.

That confidence is manufactured upstream, by the tests and the staging and the lineage that let
you trace any figure back to its source. When a stakeholder asks "is this right?", the honest,
useful answer isn't "yes" — it's "yes, and here's the chain of checks that says so." A pipeline
without that layer can't answer the question. A pipeline with it makes the question easy.

## The takeaway

The flashy parts of a data project — the live feed, the dashboard — are the parts people see.
The part that determines whether the project is worth anything is the testing and modeling layer
they don't. Spend your effort there. Trust is the product; the chart is just where it shows up.

*This grew out of my
[crypto analytics pipeline](https://github.com/Carpuro/crypto-analytics-pipeline) project.*
