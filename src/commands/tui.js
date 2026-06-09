import { search, select } from '@inquirer/prompts';
import { getAllJobs, getJobDetails } from '../api.js';
import { handleStatus } from './status.js';
import { handleWhy } from './why.js';

export async function handleTui() {
  try {
    console.log('Fetching projects from Jenkins...');
    const jobs = await getAllJobs();
    
    if (jobs.length === 0) {
      console.log('No jobs found on Jenkins server.');
      return;
    }

    // 1. Select job
    const selectedJobUrl = await search({
      message: 'Select a Jenkins job:',
      source: async (input) => {
        const query = (input || '').toLowerCase();
        const choices = jobs.map(j => ({
          name: j.name,
          value: j.url
        }));
        if (!query) return choices;
        return choices.filter(c => c.name.toLowerCase().includes(query));
      }
    });

    const jobInfo = jobs.find(j => j.url === selectedJobUrl);
    const jobData = await getJobDetails(selectedJobUrl);
    const isMultibranch = !!jobData.jobs;

    let branchName = null;

    // 2. If multibranch, select branch
    if (isMultibranch) {
      const branches = jobData.jobs;
      if (branches.length === 0) {
        console.log(`No branches found in multibranch project "${jobInfo.name}".`);
        return;
      }
      
      branchName = await search({
        message: 'Select a branch:',
        source: async (input) => {
          const query = (input || '').toLowerCase();
          const choices = branches.map(b => ({
            name: b.name,
            value: b.name
          }));
          if (!query) return choices;
          return choices.filter(c => c.name.toLowerCase().includes(query));
        }
      });
    }

    // 3. Select command action
    const action = await select({
      message: 'Select action:',
      choices: [
        { name: 'Show Build Status (status)', value: 'status' },
        { name: 'Analyze Build Failure (why)', value: 'why' }
      ]
    });

    // 4. Run handler
    const options = {
      branch: branchName,
      json: false
    };

    console.log(''); // newline for spacing
    if (action === 'status') {
      await handleStatus(jobInfo.name, options);
    } else {
      await handleWhy(jobInfo.name, options);
    }
  } catch (error) {
    if (error.name === 'ExitPromptError' || error.message?.includes('force closed')) {
      console.log('\nOperation cancelled.');
      return;
    }
    console.error(`\x1b[31mError:\x1b[0m ${error.message}`);
    process.exit(1);
  }
}
