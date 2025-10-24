import { useState, useEffect } from 'react'
import { Clock, Plus, FileText } from 'lucide-react'
import JobForm from './components/JobForm'
import JobList from './components/JobList'
import JobDetails from './components/JobDetails'
import Toast from './components/Toast'

export interface CronJobData {
  id: string
  name: string
  command: string
  schedule: string
  enabled: boolean
  lastRun?: Date | string
  nextRun?: Date | string
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
  startTime: Date | string
  endTime?: Date | string
  status: 'success' | 'error' | 'running'
  output?: string
  error?: string
  duration?: number // milliseconds
}

interface ToastData {
  id: string
  type: 'success' | 'error'
  message: string
}

function App() {
  const [jobs, setJobs] = useState<CronJobData[]>([])
  const [selectedJob, setSelectedJob] = useState<CronJobData | null>(null)
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState<CronJobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [jobLogs, setJobLogs] = useState<JobExecutionLog[]>([])

  useEffect(() => {
    loadJobs()
    loadJobLogs()
    loadAutoSyncStatus()
  }, [])

  const loadAutoSyncStatus = async () => {
    try {
      const status = await (window as any).electronAPI.getAutoSyncStatus()
      setAutoSyncEnabled(status)
    } catch (error) {
      console.error('Error loading auto-sync status:', error)
    }
  }

  useEffect(() => {
    if (selectedJob) {
      loadJobLogs(selectedJob.id)
    }
  }, [selectedJob])

  const loadJobs = async (currentSelectedJobId?: string | null) => {
    try {
      setLoading(true)
      const jobList = await (window as any).electronAPI.getJobs()
      
      // Convert date strings back to Date objects
      const processedJobs = jobList.map((job: any) => ({
        ...job,
        lastRun: job.lastRun ? new Date(job.lastRun) : undefined,
        nextRun: job.nextRun ? new Date(job.nextRun) : undefined
      }))
      
      setJobs(processedJobs)

      // Cập nhật lại selectedJob sau khi tải lại danh sách
      if (currentSelectedJobId) {
        const newSelectedJob = processedJobs.find((j: any) => j.id === currentSelectedJobId)
        setSelectedJob(newSelectedJob || null)
      } else if (processedJobs.length > 0 && !selectedJob) {
        // Chọn job đầu tiên nếu chưa có job nào được chọn
        setSelectedJob(processedJobs[0] || null)
      }
    } catch (error) {
      showToast('error', 'Không thể tải danh sách công việc')
    } finally {
      setLoading(false)
    }
  }

  const loadJobLogs = async (jobId?: string) => {
    try {
      const logs = await (window as any).electronAPI.getJobLogs(jobId)
      
      // Convert date strings back to Date objects
      const processedLogs = logs.map((log: any) => ({
        ...log,
        startTime: new Date(log.startTime),
        endTime: log.endTime ? new Date(log.endTime) : undefined
      }))
      
      setJobLogs(processedLogs)
    } catch (error) {
      console.error('Error loading job logs:', error)
    }
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const handleAddJob = async (jobData: CronJobData) => {
    try {
      const success = await (window as any).electronAPI.addJob(jobData)
      if (success) {
        await loadJobs(jobData.id) // Chọn job vừa thêm
        setShowJobForm(false)
        showToast('success', 'Đã thêm công việc mới thành công')
      } else {
        showToast('error', 'Không thể thêm công việc')
      }
    } catch (error) {
      showToast('error', 'Lỗi khi thêm công việc')
    }
  }

  const handleUpdateJob = async (id: string, jobData: Partial<CronJobData>) => {
    try {
      const success = await (window as any).electronAPI.updateJob(id, jobData)
      if (success) {
        await loadJobs(id) // Giữ job đang được chọn
        setEditingJob(null)
        showToast('success', 'Đã cập nhật công việc thành công')
      } else {
        showToast('error', 'Không thể cập nhật công việc')
      }
    } catch (error) {
      showToast('error', 'Lỗi khi cập nhật công việc')
    }
  }

  const handleDeleteJob = async (id: string) => {
    try {
      const success = await (window as any).electronAPI.deleteJob(id)
      if (success) {
        const currentJobs = jobs.filter(j => j.id !== id)
        setJobs(currentJobs)
        if (selectedJob?.id === id) {
          // Chọn job đầu tiên nếu còn, nếu không thì set null
          setSelectedJob(currentJobs[0] || null)
        }
        showToast('success', 'Đã xóa công việc thành công')
      } else {
        showToast('error', 'Không thể xóa công việc')
      }
    } catch (error) {
      showToast('error', 'Lỗi khi xóa công việc')
    }
  }

  const handleExportToCrontab = async () => {
    try {
      const result = await (window as any).electronAPI.exportToCrontab()
      if (result.success) {
        showToast('success', result.message)
      } else {
        showToast('error', result.message)
      }
    } catch (error) {
      console.error('Error exporting to crontab:', error)
      showToast('error', 'Lỗi khi export cron jobs!')
    }
  }

  const handleImportFromCrontab = async () => {
    try {
      const result = await (window as any).electronAPI.importFromCrontab()
      if (result.success) {
        loadJobs()
        showToast('success', result.message)
      } else {
        showToast('error', result.message)
      }
    } catch (error) {
      console.error('Error importing from crontab:', error)
      showToast('error', 'Lỗi khi import cron jobs!')
    }
  }

  const handleToggleAutoSync = async () => {
    try {
      const result = await (window as any).electronAPI.setAutoSync(!autoSyncEnabled)
      if (result.success) {
        setAutoSyncEnabled(!autoSyncEnabled)
        showToast('success', result.message)
      } else {
        showToast('error', result.message)
      }
    } catch (error) {
      console.error('Error toggling auto-sync:', error)
      showToast('error', 'Lỗi khi cài đặt auto-sync!')
    }
  }

  const handleToggleJob = async (id: string) => {
    try {
      const success = await (window as any).electronAPI.toggleJob(id)
      if (success) {
        await loadJobs(id) // Giữ job đang được chọn
        showToast('success', 'Đã thay đổi trạng thái công việc')
      } else {
        showToast('error', 'Không thể thay đổi trạng thái công việc')
      }
    } catch (error) {
      showToast('error', 'Lỗi khi thay đổi trạng thái công việc')
    }
  }

  const handleDuplicateJob = async (job: CronJobData) => {
    try {
      const result = await (window as any).electronAPI.duplicateJob(job.id)
      if (result.success) {
        await loadJobs(result.job?.id) // Chọn job vừa nhân bản
        showToast('success', result.message)
      } else {
        showToast('error', result.message)
      }
    } catch (error) {
      showToast('error', 'Lỗi khi nhân bản công việc')
    }
  }

  const handleTestJob = async (command: string, audioConfig?: AudioNotificationConfig) => {
    try {
      const result = await (window as any).electronAPI.testJob(command, audioConfig)
      if (result.success) {
        showToast('success', 'Test thành công!')
      } else {
        showToast('error', `Test thất bại: ${result.error}`)
      }
      return result
    } catch (error) {
      showToast('error', 'Lỗi khi test công việc')
      return { success: false, output: '', error: 'Unknown error' }
    }
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  if (loading) {
    return (
      <div className="app">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div className="loading"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          <Clock size={20} />
          Cron Job Manager
        </h1>
        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280' }}>Auto-sync:</label>
            <button
              className={`btn ${autoSyncEnabled ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleToggleAutoSync}
              title={autoSyncEnabled ? 'Tắt tự động đồng bộ với crontab' : 'Bật tự động đồng bộ với crontab'}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '6px 12px',
                fontSize: '12px'
              }}
            >
              {autoSyncEnabled ? '✓ Bật' : '○ Tắt'}
            </button>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowJobForm(true)}
          >
            <Plus size={14} />
            Thêm công việc
          </button>
        </div>
      </header>

      <div className="main-content">
        <JobList
          jobs={jobs}
          selectedJob={selectedJob}
          onSelectJob={setSelectedJob}
          onEditJob={setEditingJob}
          onDeleteJob={handleDeleteJob}
          onToggleJob={handleToggleJob}
          onDuplicateJob={handleDuplicateJob}
        />

        <div className="content-area">
          {selectedJob ? (
            <JobDetails
              job={selectedJob}
              logs={jobLogs}
              onUpdateJob={handleUpdateJob}
              onTestJob={handleTestJob}
              onEditJob={setEditingJob} // Truyền hàm setEditingJob để mở form chỉnh sửa
              onDeleteJob={handleDeleteJob} // Truyền hàm handleDeleteJob để xóa công việc
            />
          ) : (
            <div className="empty-state">
              <FileText size={48} color="#8e8e93" />
              <h2>Chưa có công việc nào</h2>
              <p>Hãy thêm công việc đầu tiên để bắt đầu quản lý lịch trình</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowJobForm(true)}
              >
                <Plus size={14} />
                Thêm công việc đầu tiên
              </button>
            </div>
          )}
        </div>
      </div>

      {showJobForm && (
        <JobForm
          job={null}
          onSave={handleAddJob}
          onCancel={() => setShowJobForm(false)}
        />
      )}

      {editingJob && (
        <JobForm
          job={editingJob}
          onSave={(jobData) => handleUpdateJob(editingJob.id, jobData)}
          onCancel={() => setEditingJob(null)}
        />
      )}

      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default App
