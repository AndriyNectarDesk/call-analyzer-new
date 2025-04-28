/**
 * Scheduler Service
 * 
 * Manages scheduled jobs using node-cron
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Map to store active jobs
const activeJobs = new Map();

/**
 * Initialize the scheduler and load all jobs
 */
function initializeScheduler() {
  try {
    console.log('Initializing scheduler service...');
    
    // Get path to jobs directory
    const jobsDir = path.join(__dirname, '../jobs');
    
    // Check if directory exists
    if (!fs.existsSync(jobsDir)) {
      console.log('Jobs directory not found, creating...');
      fs.mkdirSync(jobsDir, { recursive: true });
      return;
    }
    
    // Read all job files
    const jobFiles = fs.readdirSync(jobsDir)
      .filter(file => file.endsWith('.js'));
    
    if (jobFiles.length === 0) {
      console.log('No job files found in jobs directory');
      return;
    }
    
    console.log(`Found ${jobFiles.length} job files`);
    
    // Load and schedule each job
    jobFiles.forEach(file => {
      try {
        const jobPath = path.join(jobsDir, file);
        const job = require(jobPath);
        
        if (!job.name || !job.schedule || !job.job) {
          console.warn(`Job file ${file} is missing required properties (name, schedule, job)`);
          return;
        }
        
        // Schedule the job
        scheduleJob(job.name, job.schedule, job.job);
      } catch (jobError) {
        console.error(`Error loading job file ${file}:`, jobError);
      }
    });
    
    console.log('Scheduler service initialized successfully');
  } catch (error) {
    console.error('Error initializing scheduler service:', error);
  }
}

/**
 * Schedule a job with cron
 * @param {String} name - Job name
 * @param {String} schedule - Cron schedule expression
 * @param {Function} jobFunction - Function to execute
 */
function scheduleJob(name, schedule, jobFunction) {
  try {
    // Validate schedule
    if (!cron.validate(schedule)) {
      console.error(`Invalid cron schedule for job ${name}: ${schedule}`);
      return;
    }
    
    // If job already exists, stop it
    if (activeJobs.has(name)) {
      stopJob(name);
    }
    
    // Schedule the new job
    const task = cron.schedule(schedule, async () => {
      try {
        console.log(`Running scheduled job: ${name}`);
        
        // Check MongoDB connection before running job
        if (mongoose.connection.readyState !== 1) {
          console.error(`MongoDB not connected, skipping job: ${name}`);
          return;
        }
        
        await jobFunction();
        console.log(`Job ${name} completed successfully`);
      } catch (error) {
        console.error(`Error running job ${name}:`, error);
      }
    });
    
    // Store in active jobs map
    activeJobs.set(name, { task, schedule, function: jobFunction });
    console.log(`Job ${name} scheduled with cron: ${schedule}`);
  } catch (error) {
    console.error(`Error scheduling job ${name}:`, error);
  }
}

/**
 * Stop a scheduled job
 * @param {String} name - Job name
 */
function stopJob(name) {
  try {
    if (activeJobs.has(name)) {
      const job = activeJobs.get(name);
      job.task.stop();
      activeJobs.delete(name);
      console.log(`Job ${name} stopped`);
      return true;
    }
    
    console.warn(`Job ${name} not found, cannot stop`);
    return false;
  } catch (error) {
    console.error(`Error stopping job ${name}:`, error);
    return false;
  }
}

/**
 * Run a job immediately, outside of its schedule
 * @param {String} name - Job name
 */
async function runJobNow(name) {
  try {
    if (activeJobs.has(name)) {
      const job = activeJobs.get(name);
      console.log(`Running job ${name} manually`);
      await job.function();
      console.log(`Manual execution of job ${name} completed`);
      return true;
    }
    
    console.warn(`Job ${name} not found, cannot run`);
    return false;
  } catch (error) {
    console.error(`Error running job ${name} manually:`, error);
    return false;
  }
}

/**
 * Get list of all scheduled jobs
 * @returns {Array} Array of job information objects
 */
function getScheduledJobs() {
  const jobs = [];
  
  for (const [name, job] of activeJobs.entries()) {
    jobs.push({
      name,
      schedule: job.schedule,
      status: job.task.getStatus()
    });
  }
  
  return jobs;
}

// Export functions
module.exports = {
  initializeScheduler,
  scheduleJob,
  stopJob,
  runJobNow,
  getScheduledJobs
}; 