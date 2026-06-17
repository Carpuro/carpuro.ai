---
title: "One pipeline, three clouds"
description: "What it actually takes to run the same data pipeline on AWS, Azure, and GCP — and why the goal isn't to use every cloud at once, but to stop the cloud from owning your workflow."
date: 2026-05-28
tag: Engineering
---

"Multicloud" gets sold as a buzzword and bought as an anxiety. Most teams don't actually want to
run everything everywhere — they want to *not be trapped*. There's a difference, and it changes
how you build.

The trap is rarely the warehouse itself. It's the managed glue around it: the provider's
proprietary orchestrator, its event triggers, its function runtime, its IAM dialect. Write your
pipeline against those and migrating clouds means rewriting the pipeline. The data was never the
lock-in. The workflow was.

## The principle: own the workflow, rent the compute

The architecture I keep coming back to draws one hard line: the *orchestration and
transformation logic* belong to the platform, and the *cloud* is just where compute and storage
happen to run.

In practice that means:

- **Orchestration in one place.** A single Airflow layer owns the DAGs — what runs, in what
  order, with what retries and alerts. It can dispatch work to any cloud, but the schedule and
  the dependencies live somewhere provider-neutral.
- **Transformation as portable code.** dbt models are just SQL plus a target. Point them at
  BigQuery, Snowflake, or Spark and the *logic* doesn't change — only the adapter does.
- **Ingestion behind an interface.** Provider-specific extract code is wrapped so the pipeline
  asks for "the data" without caring whether it came from an S3 bucket, a GCS bucket, or Azure
  Blob.
- **Environments as code.** Terraform describes the infrastructure once, parameterized per
  provider, so standing up the same stack on a second cloud is a config change, not a project.

## What you get for the discipline

Two things, mostly.

First, **observability that survives a migration**. Because every run flows through the same
orchestration and the same data-quality tests, "is this pipeline healthy?" has one answer in one
dashboard regardless of where it executed. Lineage doesn't reset when you change providers.

Second, **leverage**. When the orchestration and transformations are portable, moving a workload
is a scheduling decision, not a rewrite. That's the real value of multicloud — not running on
three clouds for its own sake, but being *able* to, which is what keeps a negotiation honest and
a roadmap open.

## The honest cost

This isn't free. A provider-neutral layer means giving up some of the convenience of a cloud's
native tooling, and there's real work in the interfaces and the Terraform. The trade is
deliberate: you pay a bit of upfront abstraction to buy portability. For a one-off internal job,
don't bother. For a platform you expect to live for years — or that a client doesn't want welded
to a single vendor — it pays for itself the first time priorities change.

*This is the thinking behind my
[multicloud data pipelines](https://github.com/Carpuro/multicloud-data-pipelines) project.*
