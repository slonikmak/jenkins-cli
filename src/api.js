import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Load .env from home directory, then process.cwd()
const homeEnv = path.join(os.homedir(), '.env');
if (fs.existsSync(homeEnv)) {
  dotenv.config({ path: homeEnv });
}
dotenv.config();

const getHeaders = () => {
  const user = process.env.JENKINS_USER || process.env.JENKINS_LOGIN;
  const pass = process.env.JENKINS_PASS;
  if (!user || !pass) {
    throw new Error('Jenkins credentials are not configured. Please set JENKINS_USER (or JENKINS_LOGIN) and JENKINS_PASS environment variables.');
  }
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json'
  };
};

export const getJenkinsUrl = () => {
  let url = process.env.JENKINS_URL;
  if (!url) {
    throw new Error('Jenkins URL is not configured. Please set JENKINS_URL environment variable.');
  }
  if (!url.endsWith('/')) {
    url += '/';
  }
  return url;
};

/**
 * Resolves the Jenkins job and branch names, returning details about the job.
 * Handles multibranch pipelines and regular pipelines.
 */
export async function getJobInfo(jobName, branchName = null) {
  const baseUrl = getJenkinsUrl();
  const headers = getHeaders();

  // Fetch all top-level jobs to resolve job name
  const response = await fetch(`${baseUrl}api/json`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch job list from Jenkins (HTTP ${response.status})`);
  }
  const data = await response.json();
  const jobs = data.jobs || [];

  const clean = (s) => s.toLowerCase().replace(/[-_]/g, '');
  const targetClean = clean(jobName);

  let targetJob = jobs.find(j => clean(j.name) === targetClean);
  if (!targetJob) {
    targetJob = jobs.find(j => clean(j.name).includes(targetClean));
  }

  if (!targetJob) {
    throw new Error(`Job "${jobName}" was not found on Jenkins.`);
  }

  const jobResponse = await fetch(`${targetJob.url}api/json`, { headers });
  if (!jobResponse.ok) {
    throw new Error(`Failed to fetch job details for ${targetJob.name} (HTTP ${jobResponse.status})`);
  }
  const jobData = await jobResponse.json();

  const isMultibranch = !!jobData.jobs;

  if (isMultibranch) {
    if (branchName) {
      const branchClean = clean(branchName);
      let branchJob = jobData.jobs.find(j => clean(j.name) === branchClean);
      if (!branchJob) {
        branchJob = jobData.jobs.find(j => clean(j.name).includes(branchClean));
      }
      if (!branchJob) {
        throw new Error(`Branch "${branchName}" was not found in job ${targetJob.name}. Available branches: ${jobData.jobs.map(j => j.name).join(', ')}`);
      }
      return {
        isMultibranch: true,
        projectName: targetJob.name,
        branchName: branchJob.name,
        name: `${targetJob.name} » ${branchJob.name}`,
        url: branchJob.url,
        allBranches: jobData.jobs
      };
    } else {
      return {
        isMultibranch: true,
        projectName: targetJob.name,
        name: targetJob.name,
        url: targetJob.url,
        allBranches: jobData.jobs
      };
    }
  } else {
    return {
      isMultibranch: false,
      projectName: targetJob.name,
      name: targetJob.name,
      url: targetJob.url
    };
  }
}

/**
 * Fetch detailed information for a specific build.
 */
export async function getBuildDetails(jobUrl, buildNumber = 'lastBuild') {
  const headers = getHeaders();
  const buildUrl = `${jobUrl}${buildNumber}/api/json`;

  const response = await fetch(buildUrl, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Build "${buildNumber}" was not found.`);
    }
    throw new Error(`Failed to fetch build details (HTTP ${response.status})`);
  }

  const data = await response.json();

  // Extract commits
  const commits = [];
  const changeSets = data.changeSets || (data.changeSet ? [data.changeSet] : []);
  for (const cs of changeSets) {
    if (cs.items) {
      for (const item of cs.items) {
        commits.push({
          id: item.commitId || item.id || '',
          msg: item.msg || '',
          author: item.author?.fullName || item.authorEmail || 'Unknown',
          date: item.date || ''
        });
      }
    }
  }

  // Extract trigger causes
  const causes = [];
  if (data.actions) {
    for (const action of data.actions) {
      if (action && action.causes) {
        for (const cause of action.causes) {
          causes.push({
            description: cause.shortDescription || '',
            userId: cause.userId || null,
            userName: cause.userName || null
          });
        }
      }
    }
  }

  return {
    number: data.number,
    url: data.url,
    result: data.result, // SUCCESS, FAILURE, ABORTED, UNSTABLE, or null if building
    building: data.building,
    duration: data.duration,
    timestamp: data.timestamp,
    commits,
    causes
  };
}

/**
 * Fetch the raw build log.
 */
export async function getBuildLog(jobUrl, buildNumber = 'lastBuild') {
  const headers = {
    ...getHeaders(),
    'Accept': 'text/plain'
  };
  const logUrl = `${jobUrl}${buildNumber}/consoleText`;

  const response = await fetch(logUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch build log (HTTP ${response.status})`);
  }

  return await response.text();
}

/**
 * Parses errors and stack traces from raw console text.
 */
export function parseErrorsFromLog(logText) {
  const lines = logText.split(/\r?\n/);
  const errors = [];
  let currentError = null;

  const boilerplateKeywords = [
    '[Help 1]',
    'To see the full stack trace',
    'Re-run Maven',
    'For more information about the errors',
    'After correcting the problems',
    'mvn <args>',
    'http://cwiki.apache.org/confluence'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a known boilerplate error
    const isBoilerplate = boilerplateKeywords.some(kw => line.includes(kw)) || 
                          line.trim() === '[ERROR]' || 
                          line.trim() === 'ERROR:';
    
    const isErrorLine = !isBoilerplate && (
      line.includes('[ERROR]') || 
      line.includes('ERROR:') || 
      line.match(/^[a-zA-Z0-9.]+Exception:/)
    );
    
    if (isErrorLine) {
      if (currentError) {
        errors.push(currentError);
      }
      currentError = {
        line: i + 1,
        message: line,
        stack: []
      };
    } else if (currentError) {
      // Check if line is part of a stack trace or cause
      const isStackLine = line.match(/^\s+at /) || 
                          line.includes('Caused by:') || 
                          line.match(/^\s+\.\.\.\s+\d+\s+more/) ||
                          line.match(/^\s+-\s+/) ||
                          (line.trim() !== '' && 
                           !line.includes('[INFO]') && 
                           !line.includes('[DEBUG]') && 
                           !line.includes('[WARN]') && 
                           !line.includes('[ERROR]') && 
                           currentError.stack.length < 30);

      if (isStackLine) {
        currentError.stack.push(line);
      } else {
        errors.push(currentError);
        currentError = null;
      }
    }
  }

  if (currentError) {
    errors.push(currentError);
  }

  // Return the first 10 unique errors to avoid flooding and capture root causes
  return errors.slice(0, 10);
}

/**
 * Fetch all top-level jobs from Jenkins.
 */
export async function getAllJobs() {
  const baseUrl = getJenkinsUrl();
  const headers = getHeaders();
  const response = await fetch(`${baseUrl}api/json`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch job list from Jenkins (HTTP ${response.status})`);
  }
  const data = await response.json();
  return data.jobs || [];
}

/**
 * Fetch details of a specific job (including its sub-jobs/branches).
 */
export async function getJobDetails(jobUrl) {
  const headers = getHeaders();
  const response = await fetch(`${jobUrl}api/json`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch job details (HTTP ${response.status})`);
  }
  return await response.json();
}
