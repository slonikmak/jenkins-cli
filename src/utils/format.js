const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

export function formatDuration(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function colorToStatus(color) {
  if (!color) return { status: 'UNKNOWN', colorCode: colors.dim };
  const isBuilding = color.endsWith('_anime');
  const baseColor = isBuilding ? color.slice(0, -6) : color;
  
  let statusText = 'UNKNOWN';
  let colorCode = colors.reset;
  
  switch (baseColor) {
    case 'blue':
      statusText = 'SUCCESS';
      colorCode = colors.green;
      break;
    case 'red':
      statusText = 'FAILURE';
      colorCode = colors.red;
      break;
    case 'yellow':
      statusText = 'UNSTABLE';
      colorCode = colors.yellow;
      break;
    case 'aborted':
      statusText = 'ABORTED';
      colorCode = colors.dim;
      break;
    case 'disabled':
      statusText = 'DISABLED';
      colorCode = colors.dim;
      break;
    case 'notbuilt':
      statusText = 'NOT BUILT';
      colorCode = colors.dim;
      break;
    default:
      statusText = color.toUpperCase();
  }
  
  return {
    status: statusText,
    isBuilding,
    colorCode
  };
}

export function printStatus(info, isJson = false) {
  if (isJson) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  // Human-readable formatting
  if (info.isMultibranch && !info.branchName) {
    // Multibranch project root - print all branches
    console.log(`${colors.bright}Project:${colors.reset} ${colors.cyan}${info.projectName}${colors.reset}`);
    console.log(`${colors.bright}Branches:${colors.reset}`);
    for (const b of info.branches) {
      const { status, isBuilding, colorCode } = colorToStatus(b.color);
      const buildingStr = isBuilding ? ` [${colors.blue}BUILDING${colors.reset}]` : '';
      console.log(`  * ${colors.bright}${b.name}${colors.reset}: ${colorCode}${status}${colors.reset}${buildingStr} (${colors.dim}${b.url}${colors.reset})`);
    }
    return;
  }

  // Specific build status
  const { number, result, building, duration, timestamp, url, commits, causes } = info.build;
  
  let statusText = result || 'BUILDING';
  let statusColor = colors.blue;
  if (result === 'SUCCESS') statusColor = colors.green;
  else if (result === 'FAILURE') statusColor = colors.red;
  else if (result === 'UNSTABLE') statusColor = colors.yellow;
  else if (result === 'ABORTED') statusColor = colors.dim;

  console.log(`${colors.bright}Job:${colors.reset} ${colors.cyan}${info.name}${colors.reset}`);
  console.log(`${colors.bright}Build:${colors.reset} #${number} (${url})`);
  console.log(`${colors.bright}Status:${colors.reset} ${statusColor}${statusText}${colors.reset}${building ? ` (${colors.blue}running${colors.reset})` : ''}`);
  console.log(`${colors.bright}Start Time:${colors.reset} ${new Date(timestamp).toLocaleString()}`);
  if (!building) {
    console.log(`${colors.bright}Duration:${colors.reset} ${formatDuration(duration)}`);
  }

  console.log(`${colors.bright}Triggered By:${colors.reset}`);
  if (causes && causes.length > 0) {
    for (const cause of causes) {
      console.log(`  - ${cause.description}`);
    }
  } else {
    console.log(`  - Unknown`);
  }

  console.log(`${colors.bright}Changes (commits):${colors.reset}`);
  if (commits && commits.length > 0) {
    for (const commit of commits) {
      const hash = commit.id.substring(0, 7);
      console.log(`  ${colors.yellow}${hash}${colors.reset} ${colors.bright}${commit.author}${colors.reset}: ${commit.msg.trim()}`);
    }
  } else {
    console.log(`  - No commits`);
  }
}

export function printWhy(info, isJson = false) {
  if (isJson) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  // Human-readable formatting
  const { build } = info;
  
  if (build.result === 'SUCCESS') {
    console.log(`${colors.green}${colors.bright}Build #${build.number} succeeded! No failure causes found.${colors.reset}`);
    return;
  }

  if (build.building) {
    console.log(`${colors.blue}${colors.bright}Build #${build.number} is still running. Status is not determined yet.${colors.reset}`);
    return;
  }

  console.log(`${colors.red}${colors.bright}Build #${build.number} failed (Status: ${build.result})${colors.reset}`);
  console.log(`${colors.dim}URL: ${build.url}${colors.reset}\n`);

  console.log(`${colors.bright}Triggered By:${colors.reset}`);
  if (build.causes && build.causes.length > 0) {
    for (const cause of build.causes) {
      console.log(`  - ${cause.description}`);
    }
  } else {
    console.log(`  - Unknown`);
  }

  console.log(`\n${colors.bright}Commits in this build:${colors.reset}`);
  if (build.commits && build.commits.length > 0) {
    for (const commit of build.commits) {
      const hash = commit.id.substring(0, 7);
      console.log(`  ${colors.yellow}${hash}${colors.reset} ${colors.bright}${commit.author}${colors.reset}: ${commit.msg.trim()}`);
    }
  } else {
    console.log(`  - No commits`);
  }

  console.log(`\n${colors.red}${colors.bright}Extracted errors and stack traces from logs:${colors.reset}`);
  if (info.errors && info.errors.length > 0) {
    for (const error of info.errors) {
      console.log(`\n[Line ${error.line}] ${colors.red}${colors.bright}${error.message}${colors.reset}`);
      if (error.stack && error.stack.length > 0) {
        for (const frame of error.stack) {
          console.log(`  ${colors.dim}${frame}${colors.reset}`);
        }
      }
    }
  } else {
    console.log(`  ${colors.dim}Could not automatically extract stack trace errors. Please check the full build log in Jenkins.${colors.reset}`);
  }
}
