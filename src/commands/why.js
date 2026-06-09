import { getJobInfo, getBuildDetails, getBuildLog, parseErrorsFromLog } from '../api.js';
import { printWhy } from '../utils/format.js';

export async function handleWhy(jobName, options) {
  try {
    const { branch, build, json } = options;
    
    // Resolve job and branch
    const jobInfo = await getJobInfo(jobName, branch);
    
    if (jobInfo.isMultibranch && !jobInfo.branchName) {
      throw new Error(`To analyze build failure reasons in a multibranch project, you must specify a branch using the -b, --branch option.`);
    }

    const buildNumber = build || 'lastBuild';
    
    // Fetch build details
    const buildDetails = await getBuildDetails(jobInfo.url, buildNumber);
    
    // Only fetch and parse log if the build is not successful and not running
    let errors = [];
    if (buildDetails.result && buildDetails.result !== 'SUCCESS') {
      try {
        const logText = await getBuildLog(jobInfo.url, buildDetails.number);
        errors = parseErrorsFromLog(logText);
      } catch (logErr) {
        // Log fetching might fail if build is aborted/archived early
        errors = [{
          line: 0,
          message: `Failed to load build log: ${logErr.message}`,
          stack: []
        }];
      }
    }
    
    const result = {
      projectName: jobInfo.projectName,
      branchName: jobInfo.branchName,
      name: jobInfo.name,
      build: buildDetails,
      errors
    };
    
    printWhy(result, json);
  } catch (error) {
    if (options.json) {
      console.error(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`\x1b[31mError:\x1b[0m ${error.message}`);
    }
    process.exit(1);
  }
}
