# Jenkins CLI (`jk`)

A CLI utility for checking Jenkins build status and intelligently analyzing build failures. It is optimized for both human developer use in terminal and automated use by AI agents (with structured JSON output).

## Installation

Install the CLI tool globally directly from GitHub:

```bash
npm install -g slonikmak/jenkins-cli
```

*Note: npm will automatically fetch the repository, install dependencies, and register the global `jk` command.*

### For Developers (Cloning and Editing)
If you want to modify the source code:
1. Clone the repository:
   ```bash
   git clone https://github.com/slonikmak/jenkins-cli.git
   ```
2. Navigate to the folder:
   ```bash
   cd jenkins-cli
   ```
3. Link the package globally:
   ```bash
   npm install && npm link
   ```

---

## Configuration

The utility retrieves credentials from environment variables. You can define them in your system environment or create a `.env` file in your home directory (`~/.env` or `C:\Users\AntonMashkov\.env`):

```env
JENKINS_URL=http://your-jenkins-server-url/
JENKINS_USER=your_username (or JENKINS_LOGIN)
JENKINS_PASS=your_password
```

---

## Usage

### Interactive TUI Mode

If you run the command without any arguments in an interactive terminal, it will start TUI mode:
```bash
jk
```
This mode allows you to:
1. Search and select a project using fuzzy autocomplete (simply start typing to filter).
2. For multibranch projects, search and select the branch.
3. Select the action: show status or analyze build failure.

---

### 1. Build Status (`status`)

To get the status of the last build of a specific branch in a multibranch pipeline:
```bash
jk status etp-s-box -b development
```

To view a list of all active branches and their current statuses:
```bash
jk status etp-s-box
```

To output structured JSON (recommended for AI agents):
```bash
jk status etp-s-box -b development --json
```

**Options for `status`:**
- `-b, --branch <branch>` — Branch name in a multibranch project.
- `-n, --build <number>` — Build number (default: `lastBuild`).
- `--json` — Output result in JSON format.

---

### 2. Failure Analysis (`why`)

To analyze the root cause of a failed build on branch `development`:
```bash
jk why etp-s-box -b development
```

This will automatically extract up to 10 errors (compilation errors, test failures, stack traces) from the raw logs, removing Maven and Jenkins boilerplate.

To get the diagnostics in JSON format:
```bash
jk why etp-s-box -b development --json
```

**Options for `why`:**
- `-b, --branch <branch>` — Branch name in a multibranch project (required for multibranch projects).
- `-n, --build <number>` — Build number (default: `lastBuild`).
- `--json` — Output result in JSON format.

---

## AI Agent Integration (Skill)

The [skill/jk/SKILL.md](file:///C:/Users/AntonMashkov/Documents/projects/tools/jenkins/skill/jk/SKILL.md) file contains the agent skill definition with frontmatter metadata.

Copy it to your global agent skills folders to enable AI agents to use it:
- `~/.agents/skills/jk/SKILL.md`
- `~/.gemini/skills/jk/SKILL.md`
