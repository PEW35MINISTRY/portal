const { execSync } = require('child_process');
const fs = require('fs');

/*****************************************
* Before build, saves latest git version *
******************************************/
const updateVariable = (content, key, value) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if(regex.test(content))
    return content.replace(regex, `${key}=${value}`);
  else
    return content + `\n${key}=${value}`;
}

let envContent = '';
if(fs.existsSync('.env')) {
  envContent = fs.readFileSync('.env', 'utf8');
}

const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const gitCommitHash = execSync('git rev-parse --short HEAD').toString().trim();

//Replace/Append 
envContent = updateVariable(envContent, 'REACT_APP_GIT_BUILD_BRANCH', gitBranch);
envContent = updateVariable(envContent, 'REACT_APP_GIT_BUILD_COMMIT', gitCommitHash);

//Write data to .env file to be use in application
fs.writeFileSync('.env', envContent.trim() + '\n');

console.log('> version saved with latest git history');
