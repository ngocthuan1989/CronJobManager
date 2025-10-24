import { contextBridge, ipcRenderer } from 'electron'

export interface CronJobData {
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

export interface AudioNotificationConfig {
  enabled: boolean
  type: 'system' | 'tts' | 'file' | 'none'
  systemSound?: string // Tên system sound (ví dụ: 'Glass', 'Ping', 'Pop')
  ttsText?: string // Text để chuyển thành giọng nói
  audioFilePath?: string // Đường dẫn file âm thanh
  playOnSuccess: boolean // Phát âm thanh khi thành công
  playOnError: boolean // Phát âm thanh khi lỗi
}

export interface JobExecutionLog {
  id: string
  jobId: string
  startTime: Date
  endTime?: Date
  status: 'success' | 'error' | 'running'
  output?: string
  error?: string
  duration?: number // milliseconds
}

const electronAPI = {
  getJobs: (): Promise<CronJobData[]> => ipcRenderer.invoke('get-jobs'),
  addJob: (jobData: CronJobData): Promise<boolean> => ipcRenderer.invoke('add-job', jobData),
  updateJob: (id: string, jobData: Partial<CronJobData>): Promise<boolean> => ipcRenderer.invoke('update-job', id, jobData),
  deleteJob: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-job', id),
  toggleJob: (id: string): Promise<boolean> => ipcRenderer.invoke('toggle-job', id),
  testJob: (command: string, audioConfig?: AudioNotificationConfig): Promise<{ success: boolean; output: string; error?: string }> => ipcRenderer.invoke('test-job', command, audioConfig),
  getJobLogs: (jobId?: string): Promise<JobExecutionLog[]> => ipcRenderer.invoke('get-job-logs', jobId),
  openTerminalAndRun: (command: string, audioConfig?: AudioNotificationConfig): Promise<{ success: boolean; message: string }> => ipcRenderer.invoke('open-terminal-and-run', command, audioConfig),
  exportToCrontab: (): Promise<{ success: boolean; message: string }> => ipcRenderer.invoke('export-to-crontab'),
  importFromCrontab: (): Promise<{ success: boolean; message: string; importedCount: number }> => ipcRenderer.invoke('import-from-crontab'),
  setAutoSync: (enabled: boolean): Promise<{ success: boolean; message: string }> => ipcRenderer.invoke('set-auto-sync', enabled),
  getAutoSyncStatus: (): Promise<boolean> => ipcRenderer.invoke('get-auto-sync-status'),
  duplicateJob: (jobId: string): Promise<{ success: boolean; message: string; job?: CronJobData }> => ipcRenderer.invoke('duplicate-job', jobId),
  selectFile: (): Promise<string | null> => ipcRenderer.invoke('select-file'),
  openFileLocation: (filePath: string): Promise<void> => ipcRenderer.invoke('open-file-location', filePath),
  openLogDirectory: (logDir: string): Promise<void> => ipcRenderer.invoke('open-log-directory', logDir),
  getAvailableSystemSounds: (): Promise<string[]> => ipcRenderer.invoke('get-available-system-sounds')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}
