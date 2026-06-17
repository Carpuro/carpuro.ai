---
title: "Automation risk isn't one number"
description: "Why I model AI exposure on two axes — cognitive and embodied — instead of collapsing it into a single score, and what that reveals about the Mexican labor market."
date: 2026-06-12
tag: Research
---

Most work on "automation risk" gives an occupation a single score: a number between 0 and 1
that supposedly tells you how exposed a job is to being automated. It's a tidy story, and it's
the wrong shape.

The problem is that two completely different technologies are advancing at the same time, and
they point at *opposite* kinds of work. Large language models are getting better at reading,
writing, summarizing, and reasoning over text — the cognitive, desk-bound tasks. Robotics and
embodied AI are getting better at manipulation, locomotion, and perception in the physical
world — the manual, on-site tasks. An accountant is heavily exposed to the first and barely to
the second. A warehouse picker is the reverse.

Collapse those into one number and you erase the most important thing about the risk: *which
kind* it is.

## Two indices instead of one

For my master's research I build two purpose-made exposure indices over occupational task data:

- A **cognitive** index that tracks how the frontier of language-model capability maps onto an
  occupation's tasks — and that moves over time as benchmarks improve, rather than being frozen
  at one snapshot.
- An **embodied** index that mirrors the same construction for physical, robotics-exposed tasks,
  validated against external measures of robot exposure.

Built this way, the two indices don't just add detail — they tell a structural story. When you
factor-analyze the whole battery of exposure measures, the dominant pattern is *bipolar*: the
occupations most exposed to language models are the *least* exposed to robots, and vice versa.
It isn't two independent risks stacked on top of each other. It's a single spectrum running from
cognitive automation at one end to physical automation at the other.

## Why this matters for Jalisco

This is where a local lens changes the conclusion. Measured against the full range of
occupations, Jalisco's workforce leans toward the *physical* end — manufacturing, agriculture,
logistics, machine operation. The robotics frontier, not the LLM frontier, is the one that maps
onto most of the state's jobs.

But within Mexico, Jalisco is also one of the more *cognitive* states, thanks to Guadalajara's
services and tech economy. So the state is bi-frontal: a cognitive metropolis sitting inside an
embodied industrial corridor. A single risk score would have hidden both halves of that.

The policy implication is the real payoff. If exposure were one number, you'd write one policy.
Because it's two poles, you need two: reskilling and labor-market support look very different for
a population facing language-model substitution than for one facing robotic substitution. Naming
*which* frontier is bearing down on *which* workers is the whole point.

## The takeaway

A single automation-risk score is easy to publish and easy to misread. Splitting it into a
cognitive axis and an embodied axis costs more work, but it's the difference between "this job is
0.7 exposed" and "this job is exposed to robots, not to AI — and here's what that means for the
people who hold it."

*This post draws on my ongoing master's research on AI-driven labor displacement risk in Jalisco.
The [project repository](https://github.com/Carpuro/ai-automation-risk-jalisco) has the data and methods.*
