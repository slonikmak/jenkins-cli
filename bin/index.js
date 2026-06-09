#!/usr/bin/env node

import { Command } from 'commander';
import { handleStatus } from '../src/commands/status.js';
import { handleWhy } from '../src/commands/why.js';

const program = new Command();

program
  .name('jk')
  .description('Jenkins CLI to check build status and analyze failures')
  .version('1.0.0')
  .addHelpText('after', `

Example Configuration:
  Set these environment variables or define them in a ~/.env file:
    JENKINS_URL   - Jenkins server URL (e.g., http://your-jenkins-server/)
    JENKINS_USER  - Jenkins username (or JENKINS_LOGIN)
    JENKINS_PASS  - Jenkins password

Example Commands:
  $ jk status etp-s-box -b development
  $ jk status etp-s-box
  $ jk why etp-s-box -b development --json
`);

program
  .command('status')
  .description('Get the status of the last build of a job')
  .argument('<job>', 'Jenkins job name')
  .option('-b, --branch <branch>', 'Branch name (for multibranch projects)')
  .option('-n, --build <number>', 'Build number (default: lastBuild)')
  .option('--json', 'Output result in JSON format (for agents)')
  .action(handleStatus);

program
  .command('why')
  .description('Analyze the reason why a build failed')
  .argument('<job>', 'Jenkins job name')
  .option('-b, --branch <branch>', 'Branch name (for multibranch projects)')
  .option('-n, --build <number>', 'Build number (default: lastBuild)')
  .option('--json', 'Output result in JSON format (for agents)')
  .action(handleWhy);

program.parse();
