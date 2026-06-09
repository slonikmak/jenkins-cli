import { getJobInfo, getBuildDetails } from '../api.js';
import { printStatus } from '../utils/format.js';

export async function handleStatus(jobName, options) {
  try {
    const { branch, build, json } = options;
    
    // Resolve job and branch
    const jobInfo = await getJobInfo(jobName, branch);
    
    if (jobInfo.isMultibranch && !jobInfo.branchName) {
      // Root multibranch job: list branches
      const result = {
        isMultibranch: true,
        projectName: jobInfo.projectName,
        branches: jobInfo.allBranches.map(b => ({
          name: b.name,
          url: b.url,
          color: b.color
        }))
      };
      printStatus(result, json);
      return;
    }

    // Specific job or branch build details
    const buildDetails = await getBuildDetails(jobInfo.url, build || 'lastBuild');
    
    const result = {
      isMultibranch: jobInfo.isMultibranch,
      projectName: jobInfo.projectName,
      branchName: jobInfo.branchName,
      name: jobInfo.name,
      build: buildDetails
    };
    
    printStatus(result, json);
  } catch (error) {
    if (options.json) {
      console.error(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`\x1b[31mError:\x1b[0m ${error.message}`);
    }
    process.exit(1);
  }
}
