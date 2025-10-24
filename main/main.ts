import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { CronJob } from 'cron'
import Store from 'electron-store'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
const store = new Store()

interface CronJobData {
  id: string
  name: string
  command: string
  schedule: string
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  description?: string
  runMode?: 'background' | 'terminal' // 'background' = chạy ngầm, 'terminal' = mở Terminal
  audioNotification?: AudioNotificationConfig // Cấu hình âm thanh thông báo
}

interface AudioNotificationConfig {
  enabled: boolean
  type: 'system' | 'tts' | 'file' | 'none'
  systemSound?: string // Tên system sound (ví dụ: 'Glass', 'Ping', 'Pop')
  ttsText?: string // Text để chuyển thành giọng nói
  audioFilePath?: string // Đường dẫn file âm thanh
  playOnSuccess: boolean // Phát âm thanh khi thành công
  playOnError: boolean // Phát âm thanh khi lỗi
}

interface JobExecutionLog {
  id: string
  jobId: string
  startTime: Date
  endTime?: Date
  status: 'success' | 'error' | 'running'
  output?: string
  error?: string
  duration?: number // milliseconds
}

class CronJobManager {
  private jobs: Map<string, CronJob> = new Map()
  private jobData: Map<string, CronJobData> = new Map()

  constructor() {
    this.loadJobs()
    // Auto-export to crontab on startup to ensure jobs run even when app is closed
    this.autoExportToCrontab()
    // Refresh all launchd jobs to ensure they're properly loaded
    this.refreshAllLaunchdJobs()
  }

  private loadJobs() {
    const savedJobs = store.get('cronJobs', []) as CronJobData[]
    let needsMigration = false
    
    savedJobs.forEach(jobData => {
      // Ensure audioNotification has default values for existing jobs
      if (!jobData.audioNotification) {
        jobData.audioNotification = {
          enabled: false,
          type: 'system',
          systemSound: 'Glass',
          ttsText: 'Job completed',
          audioFilePath: '',
          playOnSuccess: true,
          playOnError: true
        }
        needsMigration = true
      }
      
      this.jobData.set(jobData.id, jobData)
      if (jobData.enabled) {
        this.createJob(jobData)
        // Create launchd job
        this.createLaunchdPlist(jobData)
      }
    })
    
    // Save migrated jobs back to storage
    if (needsMigration) {
      this.saveJobs()
    }
  }

  addJob(jobData: CronJobData): boolean {
    try {
      this.jobData.set(jobData.id, jobData)
      if (jobData.enabled) {
        this.createJob(jobData)
        // Create launchd job
        this.createLaunchdPlist(jobData)
      }
      this.saveJobs()
      return true
    } catch (error) {
      console.error('Error adding job:', error)
      return false
    }
  }

  updateJob(id: string, jobData: Partial<CronJobData>): boolean {
    try {
      const existingJob = this.jobData.get(id)
      if (!existingJob) return false

      const updatedJob = { ...existingJob, ...jobData }
      this.jobData.set(id, updatedJob)

      // Stop existing job if running
      if (this.jobs.has(id)) {
        this.jobs.get(id)?.stop()
        this.jobs.delete(id)
      }

      // Handle launchd job based on enabled status
      if (updatedJob.enabled) {
        this.createJob(updatedJob)
        // Create launchd job
        this.createLaunchdPlist(updatedJob)
      } else {
        // Remove launchd job if disabled
        this.removeLaunchdJob(id)
      }

      this.saveJobs()
      return true
    } catch (error) {
      console.error('Error updating job:', error)
      return false
    }
  }

  deleteJob(id: string): boolean {
    try {
      if (this.jobs.has(id)) {
        this.jobs.get(id)?.stop()
        this.jobs.delete(id)
      }
      this.jobData.delete(id)
      
      // Remove launchd job
      this.removeLaunchdJob(id)
      
      this.saveJobs()
      return true
    } catch (error) {
      console.error('Error deleting job:', error)
      return false
    }
  }

  toggleJob(id: string): boolean {
    const jobData = this.jobData.get(id)
    if (!jobData) return false

    return this.updateJob(id, { enabled: !jobData.enabled })
  }

  private createJob(jobData: CronJobData) {
    try {
      const job = new CronJob(
        jobData.schedule,
        async () => {
          const startTime = new Date()
          const logId = `${jobData.id}-${startTime.getTime()}`
          
          // Create running log entry
          const runningLog: JobExecutionLog = {
            id: logId,
            jobId: jobData.id,
            startTime,
            status: 'running'
          }
          
          try {
            console.log(`Running job: ${jobData.name}`)
            this.addJobLog(runningLog)
            
            const result = await this.executeCommand(jobData.command)
            const endTime = new Date()
            
            // Update log with success
            const successLog: JobExecutionLog = {
              ...runningLog,
              endTime,
              status: 'success',
              output: result.stdout,
              duration: endTime.getTime() - startTime.getTime()
            }
            this.addJobLog(successLog)
            
            // Update last run time
            const currentJobData = this.jobData.get(jobData.id)
            if (currentJobData) {
              this.jobData.set(jobData.id, { ...currentJobData, lastRun: startTime })
              this.saveJobs()
            }
            
            // Play audio notification for success
            if (jobData.audioNotification) {
              await this.playAudioNotification(jobData.audioNotification, true)
            }
          } catch (error) {
            const endTime = new Date()
            const errorMessage = error instanceof Error ? error.message : String(error)
            
            // Update log with error
            const errorLog: JobExecutionLog = {
              ...runningLog,
              endTime,
              status: 'error',
              error: errorMessage,
              duration: endTime.getTime() - startTime.getTime()
            }
            this.addJobLog(errorLog)
            
            console.error(`Error executing job ${jobData.name}:`, error)
            
            // Play audio notification for error
            if (jobData.audioNotification) {
              await this.playAudioNotification(jobData.audioNotification, false)
            }
          }
        },
        null,
        true,
        'Asia/Ho_Chi_Minh'
      )

      this.jobs.set(jobData.id, job)
      
      // Update next run time
      const nextRun = job.nextDate()
      this.jobData.set(jobData.id, { ...this.jobData.get(jobData.id)!, nextRun: nextRun.toJSDate() })
      this.saveJobs()
    } catch (error) {
      console.error('Error creating cron job:', error)
    }
  }

  private async detectPythonPath(): Promise<string> {
    try {
      // Try to find python3 in PATH
      const execAsync = promisify(exec)
      
      try {
        const { stdout } = await execAsync('which python3', { timeout: 5000 })
        return stdout.trim()
      } catch {
        // Fallback to common Python paths optimized for Apple Silicon
        const commonPaths = [
          // Apple Silicon optimized paths (Homebrew ARM64)
          '/opt/homebrew/bin/python3',
          '/opt/homebrew/bin/python3.11',
          '/opt/homebrew/bin/python3.10',
          '/opt/homebrew/bin/python3.9',
          // Intel Homebrew paths (for compatibility)
          '/usr/local/bin/python3',
          '/usr/local/bin/python3.11',
          '/usr/local/bin/python3.10',
          '/usr/local/bin/python3.9',
          // System Python paths
          '/usr/bin/python3',
          // Python.org framework paths
          '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
          '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3',
          '/Library/Frameworks/Python.framework/Versions/3.9/bin/python3',
          // Additional Apple Silicon paths
          '/opt/homebrew/opt/python@3.11/bin/python3',
          '/opt/homebrew/opt/python@3.10/bin/python3',
          '/opt/homebrew/opt/python@3.9/bin/python3'
        ]
        
        for (const pythonPath of commonPaths) {
          try {
            await execAsync(`${pythonPath} --version`, { timeout: 2000 })
            console.log(`Found Python at: ${pythonPath}`)
            return pythonPath
          } catch {
            continue
          }
        }
        
        // Final fallback
        console.log('Using fallback python3 command')
        return 'python3'
      }
    } catch (error) {
      console.error('Error detecting Python path:', error)
      return 'python3'
    }
  }

  // Audio notification methods
  private async playAudioNotification(config: AudioNotificationConfig, isSuccess: boolean): Promise<void> {
    try {
      if (!config.enabled) return
      
      // Check if should play based on success/error
      if (isSuccess && !config.playOnSuccess) return
      if (!isSuccess && !config.playOnError) return
      
      switch (config.type) {
        case 'system':
          await this.playSystemSound(config.systemSound || 'Glass')
          break
        case 'tts':
          await this.playTextToSpeech(config.ttsText || 'Job completed')
          break
        case 'file':
          if (config.audioFilePath) {
            await this.playAudioFile(config.audioFilePath)
          }
          break
        case 'none':
        default:
          // No audio
          break
      }
    } catch (error) {
      console.error('Error playing audio notification:', error)
    }
  }

  private async playSystemSound(soundName: string): Promise<void> {
    try {
      const execAsync = promisify(exec)
      await execAsync(`afplay /System/Library/Sounds/${soundName}.aiff`, { timeout: 5000 })
      console.log(`Played system sound: ${soundName}`)
    } catch (error) {
      console.error(`Error playing system sound ${soundName}:`, error)
    }
  }

  private async playTextToSpeech(text: string): Promise<void> {
    try {
      const execAsync = promisify(exec)
      // Use macOS say command with Vietnamese voice if available
      await execAsync(`say -v "Ting-Ting" "${text}"`, { timeout: 10000 })
      console.log(`Played TTS: ${text}`)
    } catch (error) {
      // Fallback to default voice
      try {
        const execAsync = promisify(exec)
        await execAsync(`say "${text}"`, { timeout: 10000 })
        console.log(`Played TTS (default voice): ${text}`)
      } catch (fallbackError) {
        console.error('Error playing TTS:', fallbackError)
      }
    }
  }

  private async playAudioFile(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Audio file not found: ${filePath}`)
        return
      }
      
      const execAsync = promisify(exec)
      await execAsync(`afplay "${filePath}"`, { timeout: 30000 })
      console.log(`Played audio file: ${filePath}`)
    } catch (error) {
      console.error(`Error playing audio file ${filePath}:`, error)
    }
  }

  // Get available system sounds
  getAvailableSystemSounds(): string[] {
    const commonSounds = [
      'Glass', 'Ping', 'Pop', 'Purr', 'Sosumi', 'Submarine', 'Tink',
      'Basso', 'Blow', 'Bottle', 'Frog', 'Funk', 'Glass', 'Hero',
      'Morse', 'Ping', 'Pop', 'Purr', 'Sosumi', 'Submarine', 'Tink'
    ]
    return commonSounds
  }

  private async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      console.log(`Executing command: ${command}`)
      
      // Use the exact command from the user input
      let terminalCommand = command
      
      // If command doesn't start with python interpreter, add it
      if (!command.startsWith('python3') && !command.startsWith('python') && !command.startsWith('/')) {
        const pythonPath = await this.detectPythonPath()
        terminalCommand = `${pythonPath} ${command}`
      }

      // Execute command directly instead of opening Terminal
      const execAsync = promisify(exec)
      const { stdout, stderr } = await execAsync(terminalCommand, {
        timeout: 300000, // 5 minutes timeout
        cwd: os.homedir() // Run from user's home directory
      })

      console.log(`Command output: ${stdout}`)
      if (stderr) {
        console.log(`Command stderr: ${stderr}`)
      }

      return { stdout, stderr }
    } catch (error: any) {
      console.error('Command execution error:', error)
      throw error
    }
  }

  private saveJobs() {
    const jobsArray = Array.from(this.jobData.values())
    store.set('cronJobs', jobsArray)
    
    // Auto-sync with crontab if enabled
    if (store.get('autoSyncEnabled', false)) {
      this.syncWithCrontab()
    }
    
    // Always export enabled jobs to crontab to ensure they run when app is closed
    this.autoExportToCrontab()
  }

  private async autoExportToCrontab() {
    try {
      const jobs = this.getAllJobs().filter(job => job.enabled)
      
      if (jobs.length === 0) {
        return
      }

      // Use launchd instead of crontab for macOS
      await this.createLaunchdJobs(jobs)
      console.log(`Auto-export: Created ${jobs.length} launchd jobs`)
    } catch (error) {
      console.error('Auto-export error:', error)
    }
  }

  private async refreshAllLaunchdJobs() {
    try {
      const jobs = this.getAllJobs().filter(job => job.enabled)
      
      if (jobs.length === 0) {
        return
      }

      console.log(`Refreshing ${jobs.length} launchd jobs...`)
      
      // Reload all existing launchd jobs to ensure they're active
      for (const job of jobs) {
        try {
          const launchdDir = path.join(os.homedir(), 'Library', 'LaunchAgents')
          const plistFileName = `com.cronjobmanager.${job.id}.plist`
          const plistPath = path.join(launchdDir, plistFileName)
          
          if (fs.existsSync(plistPath)) {
            // Unload and reload to refresh the job
            try {
              await promisify(exec)(`launchctl unload "${plistPath}"`, { timeout: 3000 })
            } catch (error) {
              // Job might not be loaded, ignore error
            }
            
            await promisify(exec)(`launchctl load "${plistPath}"`, { timeout: 5000 })
            console.log(`Refreshed launchd job: ${job.name}`)
          }
        } catch (error) {
          console.error(`Error refreshing launchd job ${job.name}:`, error)
        }
      }
      
      console.log(`Successfully refreshed ${jobs.length} launchd jobs`)
    } catch (error) {
      console.error('Error refreshing launchd jobs:', error)
    }
  }

  private async createLaunchdJobs(jobs: CronJobData[]) {
    try {
      // First, remove old CronJobManager launchd jobs
      await this.removeOldLaunchdJobs()

      // Create launchd directory if it doesn't exist
      const launchdDir = path.join(os.homedir(), 'Library', 'LaunchAgents')
      if (!fs.existsSync(launchdDir)) {
        fs.mkdirSync(launchdDir, { recursive: true })
      }

      // Create plist files for each job
      for (const job of jobs) {
        await this.createLaunchdPlist(job)
      }
    } catch (error) {
      console.error('Error creating launchd jobs:', error)
    }
  }

  private async removeOldLaunchdJobs() {
    try {
      const launchdDir = path.join(os.homedir(), 'Library', 'LaunchAgents')
      if (!fs.existsSync(launchdDir)) {
        return
      }

      const files = fs.readdirSync(launchdDir)
      for (const file of files) {
        if (file.startsWith('com.cronjobmanager.')) {
          const filePath = path.join(launchdDir, file)
          try {
            // Unload the job first
            await promisify(exec)(`launchctl unload "${filePath}"`, { timeout: 5000 })
          } catch (error) {
            // Job might not be loaded, ignore error
          }
          // Remove the file
          fs.unlinkSync(filePath)
        }
      }
    } catch (error) {
      console.error('Error removing old launchd jobs:', error)
    }
  }

  private async removeLaunchdJob(jobId: string) {
    try {
      const launchdDir = path.join(os.homedir(), 'Library', 'LaunchAgents')
      
      // Remove all plist files for this job (including numbered ones for multiple weekdays)
      const files = fs.readdirSync(launchdDir)
      const jobFiles = files.filter(file => file.startsWith(`com.cronjobmanager.${jobId}`))
      
      for (const file of jobFiles) {
        const filePath = path.join(launchdDir, file)
        try {
          // Unload the job first
          await promisify(exec)(`launchctl unload "${filePath}"`, { timeout: 5000 })
        } catch (error) {
          // Job might not be loaded, ignore error
        }
        // Remove the file
        fs.unlinkSync(filePath)
        console.log(`Removed launchd job file: ${file}`)
      }
      
      if (jobFiles.length > 0) {
        console.log(`Removed ${jobFiles.length} launchd job(s) for job: ${jobId}`)
      }
    } catch (error) {
      console.error(`Error removing launchd job ${jobId}:`, error)
    }
  }

  private generateCommandWithAudio(job: CronJobData): string {
    const baseCommand = job.runMode === 'terminal' 
      ? `osascript -e 'tell application "Terminal" to do script "${job.command.replace(/"/g, '\\"')}"'`
      : job.command

    // If no audio notification, return base command
    if (!job.audioNotification || !job.audioNotification.enabled) {
      return baseCommand
    }

    const audioConfig = job.audioNotification
    
    // Generate audio notification command based on type
    let audioCommand = ''
    if (audioConfig.type === 'system' && audioConfig.systemSound) {
      audioCommand = `afplay /System/Library/Sounds/${audioConfig.systemSound}.aiff`
    } else if (audioConfig.type === 'tts' && audioConfig.ttsText) {
      // Try Vietnamese voice first, fallback to default
      audioCommand = `say -v "Linh" "${audioConfig.ttsText}" 2>/dev/null || say "${audioConfig.ttsText}"`
    } else if (audioConfig.type === 'file' && audioConfig.audioFilePath) {
      audioCommand = `afplay "${audioConfig.audioFilePath}"`
    }

    if (!audioCommand) {
      return baseCommand
    }

    // Create wrapper script that executes command and plays audio based on exit code
    const wrapperScript = `#!/bin/bash
# Execute the main command
${baseCommand}
EXIT_CODE=$?

# Play audio notification based on result
if [ $EXIT_CODE -eq 0 ]; then
  # Success - play audio if enabled
  ${audioConfig.playOnSuccess ? audioCommand : ''}
else
  # Error - play audio if enabled  
  ${audioConfig.playOnError ? audioCommand : ''}
fi

exit $EXIT_CODE`

    return wrapperScript
  }

  private async createLaunchdPlist(job: CronJobData) {
    try {
      const launchdDir = path.join(os.homedir(), 'Library', 'LaunchAgents')
      
      // Parse cron schedule
      const parts = job.schedule.split(' ')
      if (parts.length !== 5) {
        throw new Error(`Invalid schedule format for job: ${job.name}`)
      }

      const [minute, hour, day, month, weekday] = parts

      // Handle multiple weekdays by creating separate jobs
      if (weekday.includes(',')) {
        const weekdays = weekday.split(',').map(w => parseInt(w.trim()))
        
        for (let i = 0; i < weekdays.length; i++) {
          const weekdayValue = weekdays[i]
          const plistFileName = `com.cronjobmanager.${job.id}.${i}.plist`
          const plistPath = path.join(launchdDir, plistFileName)
          
          // Generate command with audio notification
          const command = this.generateCommandWithAudio(job)

          const plistContent = {
            Label: `com.cronjobmanager.${job.id}.${i}`,
            ProgramArguments: ['/bin/bash', '-c', command],
            StartCalendarInterval: this.parseCronToCalendarInterval(minute, hour, day, month, weekdayValue.toString()),
            StandardOutPath: path.join(os.homedir(), 'Library', 'Logs', 'CronJobManager', `${job.id}.${i}.log`),
            StandardErrorPath: path.join(os.homedir(), 'Library', 'Logs', 'CronJobManager', `${job.id}.${i}.error.log`),
            RunAtLoad: false,
            KeepAlive: false,
            EnvironmentVariables: {
              PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
              HOME: os.homedir(),
              SHELL: '/bin/zsh',
              ARCHFLAGS: '-arch arm64',
              PYTHONPATH: '/opt/homebrew/lib/python3.11/site-packages:/usr/local/lib/python3.11/site-packages'
            },
            WorkingDirectory: os.homedir(),
            ProcessType: 'Background',
            ThrottleInterval: 0,
            LimitLoadToSessionType: 'Aqua',
            MachServices: {},
            SoftResourceLimits: {
              'NumberOfFiles': 1024,
              'NumberOfProcesses': 512
            }
          }

          // Write plist file
          const plistXml = this.objectToPlist(plistContent)
          fs.writeFileSync(plistPath, plistXml)

          // Unload existing job first to avoid conflicts
          try {
            await promisify(exec)(`launchctl unload "${plistPath}"`, { timeout: 3000 })
          } catch (error) {
            // Job might not be loaded, ignore error
          }

          // Load the job
          await promisify(exec)(`launchctl load "${plistPath}"`, { timeout: 5000 })
        }
        
        console.log(`Created ${weekdays.length} launchd jobs for weekdays: ${weekdays.join(', ')}`)
      } else {
        // Single weekday - create one job
        const plistFileName = `com.cronjobmanager.${job.id}.plist`
        const plistPath = path.join(launchdDir, plistFileName)
        
        // Generate command with audio notification
        const command = this.generateCommandWithAudio(job)

        const plistContent = {
          Label: `com.cronjobmanager.${job.id}`,
          ProgramArguments: ['/bin/bash', '-c', command],
          StartCalendarInterval: this.parseCronToCalendarInterval(minute, hour, day, month, weekday),
          StandardOutPath: path.join(os.homedir(), 'Library', 'Logs', 'CronJobManager', `${job.id}.log`),
          StandardErrorPath: path.join(os.homedir(), 'Library', 'Logs', 'CronJobManager', `${job.id}.error.log`),
          RunAtLoad: false,
          KeepAlive: false,
          EnvironmentVariables: {
            PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
            HOME: os.homedir(),
            SHELL: '/bin/zsh',
            ARCHFLAGS: '-arch arm64',
            PYTHONPATH: '/opt/homebrew/lib/python3.11/site-packages:/usr/local/lib/python3.11/site-packages'
          },
          WorkingDirectory: os.homedir(),
          ProcessType: 'Background',
          ThrottleInterval: 0,
          LimitLoadToSessionType: 'Aqua',
          MachServices: {},
          SoftResourceLimits: {
            'NumberOfFiles': 1024,
            'NumberOfProcesses': 512
          }
        }

        // Write plist file
        const plistXml = this.objectToPlist(plistContent)
        fs.writeFileSync(plistPath, plistXml)

        // Unload existing job first to avoid conflicts
        try {
          await promisify(exec)(`launchctl unload "${plistPath}"`, { timeout: 3000 })
        } catch (error) {
          // Job might not be loaded, ignore error
        }

        // Load the job
        await promisify(exec)(`launchctl load "${plistPath}"`, { timeout: 5000 })
        
        console.log(`Created launchd job: ${job.name}`)
      }

      // Create logs directory
      const logsDir = path.join(os.homedir(), 'Library', 'Logs', 'CronJobManager')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }
    } catch (error) {
      console.error(`Error creating launchd plist for job ${job.name}:`, error)
    }
  }

  private parseCronToCalendarInterval(minute: string, hour: string, day: string, month: string, weekday: string) {
    const interval: any = {}

    // Handle minute
    if (minute !== '*') {
      if (minute.includes('/')) {
        // Handle intervals like */5 (every 5 minutes)
        const [, intervalValue] = minute.split('/')
        interval.Minute = parseInt(intervalValue)
      } else if (minute.includes(',')) {
        // Handle multiple minutes like 0,15,30,45 - use first one
        const minutes = minute.split(',').map(m => parseInt(m.trim()))
        interval.Minute = minutes[0]
      } else {
        interval.Minute = parseInt(minute)
      }
    }

    // Handle hour
    if (hour !== '*') {
      if (hour.includes('/')) {
        // Handle intervals like */2 (every 2 hours)
        const [, intervalValue] = hour.split('/')
        interval.Hour = parseInt(intervalValue)
      } else if (hour.includes(',')) {
        // Handle multiple hours like 9,12,15 - use first one
        const hours = hour.split(',').map(h => parseInt(h.trim()))
        interval.Hour = hours[0]
      } else {
        interval.Hour = parseInt(hour)
      }
    }

    // Handle day
    if (day !== '*') {
      if (day.includes(',')) {
        // Handle multiple days like 1,15 - use first one
        const days = day.split(',').map(d => parseInt(d.trim()))
        interval.Day = days[0]
      } else {
        interval.Day = parseInt(day)
      }
    }

    // Handle month
    if (month !== '*') {
      if (month.includes(',')) {
        // Handle multiple months like 1,6,12 - use first one
        const months = month.split(',').map(m => parseInt(m.trim()))
        interval.Month = months[0]
      } else {
        interval.Month = parseInt(month)
      }
    }

    // Handle weekday - use first weekday for launchd
    if (weekday !== '*') {
      if (weekday.includes(',')) {
        // Handle multiple weekdays like 1,2,3,4,5 - use first one
        const weekdays = weekday.split(',').map(w => parseInt(w.trim()))
        interval.Weekday = weekdays[0]
      } else {
        interval.Weekday = parseInt(weekday)
      }
    }

    return interval
  }

  private objectToPlist(obj: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
    xml += '<plist version="1.0">\n'
    xml += '<dict>\n'

    for (const [key, value] of Object.entries(obj)) {
      xml += `  <key>${key}</key>\n`
      if (key === 'StartCalendarInterval') {
        xml += '  <dict>\n'
        for (const [intervalKey, intervalValue] of Object.entries(value as any)) {
          xml += `    <key>${intervalKey}</key>\n`
          xml += `    <integer>${intervalValue}</integer>\n`
        }
        xml += '  </dict>\n'
      } else if (key === 'EnvironmentVariables') {
        xml += '  <dict>\n'
        for (const [envKey, envValue] of Object.entries(value as any)) {
          xml += `    <key>${envKey}</key>\n`
          xml += `    <string>${envValue}</string>\n`
        }
        xml += '  </dict>\n'
      } else if (key === 'SoftResourceLimits') {
        xml += '  <dict>\n'
        for (const [limitKey, limitValue] of Object.entries(value as any)) {
          xml += `    <key>${limitKey}</key>\n`
          xml += `    <integer>${limitValue}</integer>\n`
        }
        xml += '  </dict>\n'
      } else if (key === 'MachServices') {
        xml += '  <dict>\n'
        xml += '  </dict>\n'
      } else if (Array.isArray(value)) {
        xml += '  <array>\n'
        for (const item of value) {
          xml += `    <string>${item}</string>\n`
        }
        xml += '  </array>\n'
      } else if (typeof value === 'boolean') {
        xml += `  <${value ? 'true' : 'false'}/>\n`
      } else if (typeof value === 'number') {
        xml += `  <integer>${value}</integer>\n`
      } else {
        xml += `  <string>${value}</string>\n`
      }
    }

    xml += '</dict>\n'
    xml += '</plist>\n'
    return xml
  }

  private async syncWithCrontab() {
    try {
      const jobs = this.getAllJobs().filter(job => job.enabled)
      
      // Get current crontab
      const { stdout: currentCrontab } = await promisify(exec)('crontab -l', { timeout: 5000 }).catch(() => ({ stdout: '' }))
      
      // Create new crontab entries
      const cronEntries = jobs.map(job => {
        const parts = job.schedule.split(' ')
        if (parts.length !== 5) {
          throw new Error(`Invalid schedule format for job: ${job.name}`)
        }
        return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]} ${job.command} # CronJobManager: ${job.name}`
      }).join('\n')

      // Combine with existing crontab (remove old CronJobManager entries)
      const existingLines = currentCrontab.split('\n').filter(line => !line.includes('# CronJobManager:'))
      const newCrontab = [...existingLines, cronEntries].join('\n')

      // Write to temporary file with unique name to avoid conflicts
      const tempFile = path.join(os.tmpdir(), `cronjobmanager_sync_${Date.now()}`)
      fs.writeFileSync(tempFile, newCrontab)

      // Install new crontab
      await promisify(exec)(`crontab ${tempFile}`, { timeout: 5000 })

      // Clean up temp file
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile)
          }
        } catch (error) {
          console.log('Temp file cleanup skipped:', error)
        }
      }, 1000) // Wait 1 second before cleanup

      console.log(`Auto-sync: Updated crontab with ${jobs.length} jobs`)
    } catch (error) {
      console.error('Auto-sync error:', error)
    }
  }

  private addJobLog(log: JobExecutionLog) {
    const logs = store.get('jobLogs', []) as JobExecutionLog[]
    const existingIndex = logs.findIndex(l => l.id === log.id)
    
    if (existingIndex >= 0) {
      // Update existing log
      logs[existingIndex] = log
    } else {
      // Add new log
      logs.push(log)
    }
    
    // Keep only last 100 logs per job to prevent storage bloat
    const jobLogs = logs.filter(l => l.jobId === log.jobId)
    if (jobLogs.length > 100) {
      const sortedLogs = jobLogs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      const logsToKeep = sortedLogs.slice(0, 100)
      const otherJobLogs = logs.filter(l => l.jobId !== log.jobId)
      store.set('jobLogs', [...otherJobLogs, ...logsToKeep])
    } else {
      store.set('jobLogs', logs)
    }
  }

  getAllJobs(): CronJobData[] {
    return Array.from(this.jobData.values())
  }

  getJob(id: string): CronJobData | undefined {
    return this.jobData.get(id)
  }

  getJobLogs(jobId?: string): JobExecutionLog[] {
    const logs = store.get('jobLogs', []) as JobExecutionLog[]
    
    if (jobId) {
      return logs
        .filter(log => log.jobId === jobId)
        .map(log => ({
          ...log,
          startTime: log.startTime instanceof Date ? log.startTime : new Date(log.startTime),
          endTime: log.endTime ? (log.endTime instanceof Date ? log.endTime : new Date(log.endTime)) : undefined
        }))
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    }
    
    return logs
      .map(log => ({
        ...log,
        startTime: log.startTime instanceof Date ? log.startTime : new Date(log.startTime),
        endTime: log.endTime ? (log.endTime instanceof Date ? log.endTime : new Date(log.endTime)) : undefined
      }))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  testJob(command: string, audioConfig?: AudioNotificationConfig): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        console.log('Testing command:', command)
        
        // Use the exact command from the user input
        let terminalCommand = command
        
        // If command doesn't start with python interpreter, add it
        if (!command.startsWith('python3') && !command.startsWith('python') && !command.startsWith('/')) {
          const pythonPath = await this.detectPythonPath()
          terminalCommand = `${pythonPath} ${command}`
        }

        // Execute command directly for testing
        const execAsync = promisify(exec)
        const { stdout, stderr } = await execAsync(terminalCommand, {
          timeout: 30000, // 30 seconds timeout for testing
          cwd: os.homedir() // Run from user's home directory
        })

        // Play audio notification for test success
        if (audioConfig) {
          await this.playAudioNotification(audioConfig, true)
        }

        resolve({
          success: true,
          output: stdout,
          error: stderr || undefined
        })

      } catch (error: any) {
        console.error('Test command error:', error)
        
        // Play audio notification for test error
        if (audioConfig) {
          await this.playAudioNotification(audioConfig, false)
        }
        
        resolve({
          success: false,
          output: '',
          error: error.message || 'Unknown error'
        })
      }
    })
  }

  // Export cron jobs to macOS crontab
  exportToCrontab(): Promise<{ success: boolean; message: string }> {
    return new Promise(async (resolve) => {
      try {
        const jobs = this.getAllJobs().filter(job => job.enabled)
        
        if (jobs.length === 0) {
          resolve({
            success: false,
            message: 'Không có cron job nào để export'
          })
          return
        }

        // Get current crontab
        const { stdout: currentCrontab } = await promisify(exec)('crontab -l', { timeout: 5000 }).catch(() => ({ stdout: '' }))
        
        // Create new crontab entries
        const cronEntries = jobs.map(job => {
          // Convert schedule format (minute hour day month weekday)
          const parts = job.schedule.split(' ')
          if (parts.length !== 5) {
            throw new Error(`Invalid schedule format for job: ${job.name}`)
          }
          return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]} ${job.command} # CronJobManager: ${job.name}`
        }).join('\n')

        // Combine with existing crontab (remove old CronJobManager entries)
        const existingLines = currentCrontab.split('\n').filter(line => !line.includes('# CronJobManager:'))
        const newCrontab = [...existingLines, cronEntries].join('\n')

        // Write to temporary file with unique name
        const tempFile = path.join(os.tmpdir(), `cronjobmanager_export_${Date.now()}`)
        fs.writeFileSync(tempFile, newCrontab)

        // Install new crontab
        await promisify(exec)(`crontab ${tempFile}`, { timeout: 5000 })

        // Clean up temp file
        setTimeout(() => {
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile)
            }
          } catch (error) {
            console.log('Temp file cleanup skipped:', error)
          }
        }, 1000) // Wait 1 second before cleanup

        resolve({
          success: true,
          message: `Đã export ${jobs.length} cron job(s) ra macOS crontab`
        })

      } catch (error: any) {
        console.error('Export to crontab error:', error)
        resolve({
          success: false,
          message: `Lỗi khi export: ${error.message}`
        })
      }
    })
  }

  // Enable/Disable auto-sync with crontab
  setAutoSync(enabled: boolean): Promise<{ success: boolean; message: string }> {
    return new Promise(async (resolve) => {
      try {
        store.set('autoSyncEnabled', enabled)
        
        if (enabled) {
          // Test crontab access
          try {
            await promisify(exec)('crontab -l', { timeout: 5000 })
            // Sync current jobs to crontab
            await this.syncWithCrontab()
            resolve({
              success: true,
              message: 'Đã bật auto-sync với crontab'
            })
          } catch (error) {
            resolve({
              success: false,
              message: 'Không thể truy cập crontab. Vui lòng cấp quyền truy cập.'
            })
          }
        } else {
          resolve({
            success: true,
            message: 'Đã tắt auto-sync với crontab'
          })
        }
      } catch (error: any) {
        resolve({
          success: false,
          message: `Lỗi khi cài đặt auto-sync: ${error.message}`
        })
      }
    })
  }

  // Get auto-sync status
  getAutoSyncStatus(): boolean {
    return store.get('autoSyncEnabled', false) as boolean
  }

  duplicateJob(jobId: string): Promise<{ success: boolean; message: string; job?: CronJobData }> {
    return new Promise((resolve) => {
      try {
        const originalJob = this.getJob(jobId)
        if (!originalJob) {
          resolve({ success: false, message: 'Không tìm thấy công việc để nhân bản' })
          return
        }

        // Tạo job mới với thông tin nhân bản
        const newJob: CronJobData = {
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `${originalJob.name} (Bản sao)`,
          description: originalJob.description,
          command: originalJob.command,
          schedule: originalJob.schedule,
          enabled: false // Job nhân bản sẽ ở trạng thái tắt (bản nháp)
        }

        // Lưu job mới
        this.jobData.set(newJob.id, newJob)
        this.saveJobs()

        resolve({ 
          success: true, 
          message: `Đã nhân bản công việc "${originalJob.name}" thành công`,
          job: newJob
        })
      } catch (error: any) {
        console.error('Duplicate job error:', error)
        resolve({ success: false, message: `Lỗi khi nhân bản: ${error.message}` })
      }
    })
  }

  // Import cron jobs from macOS crontab
  importFromCrontab(): Promise<{ success: boolean; message: string; importedCount: number }> {
    return new Promise(async (resolve) => {
      try {
        // Get current crontab
        const { stdout: crontab } = await promisify(exec)('crontab -l', { timeout: 5000 })
        
        // Parse CronJobManager entries
        const cronLines = crontab.split('\n').filter(line => line.includes('# CronJobManager:'))
        
        let importedCount = 0
        
        for (const line of cronLines) {
          try {
            const [schedule, command, comment] = line.split(' # CronJobManager: ')
            const jobName = comment?.trim() || `Imported Job ${importedCount + 1}`
            
            // Create new job
            const jobId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
            const newJob: CronJobData = {
              id: jobId,
              name: jobName,
              command: command.trim(),
              schedule: schedule.trim(),
              enabled: true,
              description: `Imported from crontab on ${new Date().toLocaleString()}`
            }
            
            this.jobData.set(jobId, newJob)
            importedCount++
          } catch (error) {
            console.error('Error parsing cron line:', line, error)
          }
        }
        
        if (importedCount > 0) {
          this.saveJobs()
        }
        
        resolve({
          success: true,
          message: `Đã import ${importedCount} cron job(s) từ macOS crontab`,
          importedCount
        })

      } catch (error: any) {
        console.error('Import from crontab error:', error)
        resolve({
          success: false,
          message: `Lỗi khi import: ${error.message}`,
          importedCount: 0
        })
      }
    })
  }

  // New method to open Terminal and run command
  openTerminalAndRun(command: string, audioConfig?: AudioNotificationConfig): Promise<{ success: boolean; message: string }> {
    return new Promise(async (resolve) => {
      try {
        console.log('Opening Terminal with command:', command)
        
        // Use the exact command from the user input
        let terminalCommand = command
        
        // If command doesn't start with python interpreter, add it
        if (!command.startsWith('python3') && !command.startsWith('python') && !command.startsWith('/')) {
          const pythonPath = await this.detectPythonPath()
          terminalCommand = `${pythonPath} ${command}`
        }

        // Create audio notification script if audio config is provided
        let audioNotificationScript = ''
        if (audioConfig && audioConfig.enabled) {
          switch (audioConfig.type) {
            case 'system':
              audioNotificationScript = `afplay /System/Library/Sounds/${audioConfig.systemSound || 'Glass'}.aiff`
              break
            case 'tts':
              audioNotificationScript = `say "${audioConfig.ttsText || 'Job completed'}"`
              break
            case 'file':
              if (audioConfig.audioFilePath) {
                audioNotificationScript = `afplay "${audioConfig.audioFilePath}"`
              }
              break
          }
        }

        // Open a NEW Terminal window and run command with audio notification
        const terminalScript = `echo "🚀 Manual Terminal Execution"
echo "💻 Command: ${terminalCommand}"
echo "==========================================="
${terminalCommand}
EXIT_CODE=$?
echo "==========================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Command completed successfully!"
  ${audioConfig && audioConfig.playOnSuccess ? audioNotificationScript : ''}
else
  echo "❌ Command failed with exit code: $EXIT_CODE"
  ${audioConfig && audioConfig.playOnError ? audioNotificationScript : ''}
fi
echo "Press any key to close..."
read`

        // Create a temporary script file
        const tempScriptPath = path.join(os.tmpdir(), 'manual_terminal_script.sh')
        fs.writeFileSync(tempScriptPath, terminalScript, { mode: 0o755 })

        // Open new Terminal window with the script
        spawn('open', ['-a', 'Terminal', tempScriptPath], {
          shell: true
        })

        resolve({
          success: true,
          message: 'Terminal opened successfully'
        })

      } catch (error: any) {
        console.error('Open Terminal error:', error)
        resolve({
          success: false,
          message: `Error opening Terminal: ${error.message}`
        })
      }
    })
  }
}

const cronManager = new CronJobManager()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Cron Job Manager',
    show: true,
    center: true
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('Loading development URL: http://localhost:3000')
    mainWindow.loadURL('http://localhost:3000')
    // mainWindow.webContents.openDevTools() // Commented out to prevent auto-opening DevTools
  } else {
    console.log('Loading production file:', path.join(__dirname, '../dist/renderer/index.html'))
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'))
  }

  // Focus window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window is ready to show, focusing...')
    mainWindow.focus()
  })

  // Debug: Log when page finishes loading
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Page finished loading')
  })

  // Debug: Log any errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })
}

app.whenReady().then(() => {
  console.log('Electron app is ready, creating window...')
  createWindow()

  app.on('activate', function () {
    console.log('App activated')
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC handlers
ipcMain.handle('get-jobs', () => {
  return cronManager.getAllJobs()
})

ipcMain.handle('add-job', (_, jobData: CronJobData) => {
  return cronManager.addJob(jobData)
})

ipcMain.handle('update-job', (_, id: string, jobData: Partial<CronJobData>) => {
  return cronManager.updateJob(id, jobData)
})

ipcMain.handle('delete-job', (_, id: string) => {
  return cronManager.deleteJob(id)
})

ipcMain.handle('toggle-job', (_, id: string) => {
  return cronManager.toggleJob(id)
})

ipcMain.handle('test-job', (_, command: string, audioConfig?: AudioNotificationConfig) => {
  return cronManager.testJob(command, audioConfig)
})

ipcMain.handle('get-job-logs', (_, jobId?: string) => {
  return cronManager.getJobLogs(jobId)
})

ipcMain.handle('open-terminal-and-run', (_, command: string, audioConfig?: AudioNotificationConfig) => {
  return cronManager.openTerminalAndRun(command, audioConfig)
})

ipcMain.handle('export-to-crontab', () => {
  return cronManager.exportToCrontab()
})

ipcMain.handle('import-from-crontab', () => {
  return cronManager.importFromCrontab()
})

ipcMain.handle('set-auto-sync', (_, enabled: boolean) => {
  return cronManager.setAutoSync(enabled)
})

  ipcMain.handle('get-auto-sync-status', () => {
    return cronManager.getAutoSyncStatus()
  })

  ipcMain.handle('duplicate-job', async (_, jobId: string) => {
    return await cronManager.duplicateJob(jobId)
  })

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Python Scripts', extensions: ['py'] },
      { name: 'Shell Scripts', extensions: ['sh', 'bash'] },
      { name: 'JavaScript', extensions: ['js', 'ts'] }
    ]
  })
  
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('open-file-location', (_, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('open-log-directory', (_, logDir: string) => {
  shell.openPath(logDir)
})

ipcMain.handle('get-available-system-sounds', () => {
  return cronManager.getAvailableSystemSounds()
})
