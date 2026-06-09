---
name: jk
description: Check Jenkins build status and analyze build failures using jk CLI tool. Use when user asks "why did build fail", "get build status", "check development build", or "what is the build error". Triggers on phrases like "jenkins build", "why build failed", "check last build".
---

# Jenkins Build status & Diagnostics (`jk` CLI)

Use this skill to fetch the build status of Jenkins jobs and analyze the root causes of build failures (compilation errors, test failures, stack traces) using the global `jk` CLI tool.

## Prerequisites

- The global `jk` tool must be installed (run `npm link` in the tool directory if not linked).

## Workflow for Agents

> [!IMPORTANT]
> Always prefer using the `--json` flag when executing `jk` from an agent conversation. JSON output is structured, predictable, and consumes significantly fewer tokens than human-readable text.

### 1. Check Job Status

To get a summary of all branches in a multibranch pipeline:
```bash
jk status <job-name> --json
```

To get the status of a specific branch and build:
```bash
jk status <job-name> -b <branch-name> --json
# Or for a specific build number:
jk status <job-name> -b <branch-name> -n <build-number> --json
```

**JSON response format:**
```json
{
  "isMultibranch": true,
  "projectName": "my_pipeline_job",
  "branchName": "development",
  "name": "my_pipeline_job » development",
  "build": {
    "number": 2172,
    "url": "http://your-jenkins-server/job/my_pipeline_job/job/development/2172/",
    "result": "SUCCESS", // SUCCESS, FAILURE, ABORTED, or null (if building)
    "building": false,
    "duration": 1299498,
    "timestamp": 1780952837204,
    "commits": [
      {
        "id": "42d1d5aea0822d807994e218eb289638ec9ca7fd",
        "msg": "fixed tests",
        "author": "developer",
        "date": "2026-06-09 00:06:00 +0300"
      }
    ],
    "causes": [
      {
        "description": "Branch indexing",
        "userId": null,
        "userName": null
      }
    ]
  }
}
```

### 2. Diagnose Build Failures

If a build status is `FAILURE`, run the `why` command to fetch the extracted errors and stack traces:

```bash
jk why <job-name> -b <branch-name> --json
# Or for a specific build number:
jk why <job-name> -b <branch-name> -n <build-number> --json
```

This will automatically extract up to 10 root-cause errors (e.g. Java compilation errors, assertion failures) and their corresponding stack traces, skipping boilerplate Maven messages.

**JSON response format:**
```json
{
  "projectName": "my_pipeline_job",
  "branchName": "feature-branch",
  "name": "my_pipeline_job » feature-branch",
  "build": {
    "number": 1,
    "result": "FAILURE",
    "building": false,
    "commits": [],
    "causes": [{"description": "Branch indexing"}]
  },
  "errors": [
    {
      "line": 618,
      "message": "[ERROR] /path/to/File.java:[3,49] cannot find symbol",
      "stack": [
        "  symbol:   class SomeType",
        "  location: package com.example.repository"
      ]
    }
  ]
}
```

## Troubleshooting

- **Error: "Job ... was not found..."** -> Check job name spelling. The CLI performs fuzzy matching (e.g. matching `my-pipeline-job` to `my_pipeline_job`).
