import { getJobInfo, triggerJob } from '../api.js';

export async function handleTrigger(jobName, options) {
  try {
    const { branch, json } = options;
    
    // Resolve job and branch
    const jobInfo = await getJobInfo(jobName, branch);
    
    if (jobInfo.isMultibranch && !jobInfo.branchName) {
      throw new Error(`Job "${jobName}" is a multibranch project. Please specify a branch using -b or --branch.`);
    }

    const result = await triggerJob(jobInfo.url);
    
    if (json) {
      console.log(JSON.stringify({
        success: true,
        projectName: jobInfo.projectName,
        branchName: jobInfo.branchName || null,
        status: result.status,
        url: result.url
      }, null, 2));
    } else {
      const targetStr = jobInfo.branchName ? `${jobInfo.projectName} » ${jobInfo.branchName}` : jobInfo.projectName;
      console.log(`\x1b[32mSUCCESS:\x1b[0m Job ${targetStr} has been triggered successfully!`);
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`\x1b[31mError:\x1b[0m ${error.message}`);
    }
    process.exit(1);
  }
}
