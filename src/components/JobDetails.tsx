import React, { useState } from 'react'
import { Clock, Play, Pause, Edit3, TestTube, Calendar, FileText, Trash2, History, CheckCircle, XCircle, Loader } from 'lucide-react'
import { CronJobData, JobExecutionLog, AudioNotificationConfig } from '../App'

interface JobDetailsProps {
  job: CronJobData
  logs: JobExecutionLog[]
  onUpdateJob: (id: string, jobData: Partial<CronJobData>) => void
  onTestJob: (command: string, audioConfig?: AudioNotificationConfig) => Promise<{ success: boolean; output: string; error?: string }>
  onEditJob: (job: CronJobData) => void
  onDeleteJob: (id: string) => void
}

function JobDetails({ job, logs, onUpdateJob, onTestJob, onEditJob, onDeleteJob }: JobDetailsProps) {
  const [testResult, setTestResult] = useState<{ success: boolean; output: string; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Chưa có'
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getNextRunText = (nextRun?: Date | string) => {
    if (!nextRun) return 'Chưa xác định'
    
    const nextRunDate = nextRun instanceof Date ? nextRun : new Date(nextRun)
    const now = new Date()
    const diff = nextRunDate.getTime() - now.getTime()
    
    if (diff < 0) return 'Đã hết hạn'
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} ngày tới`
    if (hours > 0) return `${hours} giờ tới`
    if (minutes > 0) return `${minutes} phút tới`
    
    return 'Sắp chạy'
  }

  const parseSchedule = (schedule: string) => {
    const parts = schedule.split(' ')
    if (parts.length !== 5) return 'Định dạng không hợp lệ'
    
    const [minute, hour, day, month, weekday] = parts
    
    let result = ''
    
    if (minute === '*' && hour === '*') {
      result = 'Mỗi phút'
    } else if (minute !== '*' && hour === '*') {
      result = `Mỗi ${minute.includes('/') ? minute.split('/')[1] : minute} phút`
    } else if (minute === '0' && hour !== '*') {
      if (hour.includes('/')) {
        const interval = hour.split('/')[1]
        result = `Mỗi ${interval} giờ`
      } else {
        result = `Hàng ngày lúc ${hour.padStart(2, '0')}:00`
      }
    } else if (minute !== '0' && hour !== '*') {
      result = `Hàng ngày lúc ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    } else if (day !== '*') {
      result = `Hàng tháng vào ngày ${day}`
    } else if (weekday !== '*') {
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
      result = `Hàng tuần vào ${days[parseInt(weekday)]}`
    }
    
    return result || schedule
  }

  const handleTestCommand = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const result = await onTestJob(job.command, job.audioNotification)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        output: '',
        error: 'Lỗi khi test lệnh'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleViewLogs = () => {
    // Open log files in Finder
    const logDir = `${process.env.HOME || '~'}/Library/Logs/CronJobManager`
    window.electronAPI.openLogDirectory(logDir)
  }


  const handleToggleEnabled = () => {
    onUpdateJob(job.id, { enabled: !job.enabled })
  }

  return (
    <div className="job-details">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>
          <FileText size={24} />
          {job.name}
        </h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn ${job.enabled ? 'btn-secondary' : 'btn-success'}`}
            onClick={handleToggleEnabled}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {job.enabled ? <Pause size={14} /> : <Play size={14} />}
            {job.enabled ? 'Tạm dừng' : 'Kích hoạt'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handleTestCommand}
            disabled={testing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {testing ? (
              <>
                <div className="loading" style={{ width: '14px', height: '14px' }}></div>
                Đang test...
              </>
            ) : (
              <>
                <TestTube size={14} />
                Test lệnh
              </>
            )}
          </button>

          
          {/* Nút Chỉnh sửa */}
          <button
            className="btn btn-secondary"
            onClick={() => onEditJob(job)}
            title="Chỉnh sửa công việc"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={14} />
            Chỉnh sửa
          </button>

          {/* Nút Xóa */}
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Bạn có chắc muốn xóa công việc này?')) {
                onDeleteJob(job.id)
              }
            }}
            title="Xóa công việc"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} />
            Xóa
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>
            <Clock size={16} />
            Lịch trình
          </label>
          <div style={{ 
            padding: '12px 16px', 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            fontFamily: 'Monaco, Menlo, monospace',
            fontSize: '14px'
          }}>
            {job.schedule}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginTop: '4px' 
          }}>
            {parseSchedule(job.schedule)}
          </div>
        </div>

        <div className="form-group">
          <label>
            <Calendar size={16} />
            Trạng thái
          </label>
          <div style={{ 
            padding: '12px 16px', 
            background: job.enabled ? '#f0fdf4' : '#fef2f2', 
            border: `1px solid ${job.enabled ? '#bbf7d0' : '#fecaca'}`, 
            borderRadius: '8px',
            color: job.enabled ? '#166534' : '#dc2626',
            fontWeight: '500'
          }}>
            {job.enabled ? '✅ Đang hoạt động' : '⏸️ Đã tạm dừng'}
          </div>
        </div>

        <div className="form-group">
          <label>
            <Play size={16} />
            Chế độ chạy
          </label>
          <div style={{ 
            padding: '12px 16px', 
            background: job.runMode === 'terminal' ? '#fef3c7' : '#f0f9ff', 
            border: `1px solid ${job.runMode === 'terminal' ? '#fde68a' : '#bae6fd'}`, 
            borderRadius: '8px',
            color: job.runMode === 'terminal' ? '#92400e' : '#1e40af',
            fontWeight: '500'
          }}>
            {job.runMode === 'terminal' ? '🖥️ Mở Terminal' : '🔇 Chạy ngầm'}
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Lần chạy cuối</label>
          <div style={{ 
            padding: '12px 16px', 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {formatDate(job.lastRun)}
          </div>
        </div>

        <div className="form-group">
          <label>Lần chạy tiếp theo</label>
          <div style={{ 
            padding: '12px 16px', 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {formatDate(job.nextRun)}
            {job.nextRun && (
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                marginTop: '4px' 
              }}>
                ({getNextRunText(job.nextRun)})
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Lệnh thực thi</label>
        <div style={{ 
          padding: '12px 16px', 
          background: '#1f2937', 
          color: '#f9fafb', 
          border: '1px solid #374151', 
          borderRadius: '8px',
          fontFamily: 'Monaco, Menlo, monospace',
          fontSize: '14px',
          wordBreak: 'break-all'
        }}>
          {job.command}
        </div>
      </div>

      {job.description && (
        <div className="form-group">
          <label>Mô tả</label>
          <div style={{ 
            padding: '12px 16px', 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {job.description}
          </div>
        </div>
      )}

      {testResult && (
        <div className="form-group">
          <label>Kết quả test</label>
          <div className={`test-output ${testResult.success ? 'success' : 'error'}`}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              {testResult.success ? '✅ Test thành công' : '❌ Test thất bại'}
            </div>
            {testResult.output && (
              <div>
                <strong>Output:</strong>
                <pre style={{ marginTop: '4px' }}>{testResult.output}</pre>
              </div>
            )}
            {testResult.error && (
              <div>
                <strong>Lỗi:</strong>
                <pre style={{ marginTop: '4px', color: '#fca5a5' }}>{testResult.error}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Execution History */}
      <div className="form-group">
        <label>
          <History size={16} />
          Lịch sử thực thi ({logs.length})
        </label>
        <div className="logs-container">
          {logs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#8e8e93',
              fontSize: '14px'
            }}>
              Chưa có lịch sử thực thi
            </div>
          ) : (
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className={`log-item ${log.status}`}>
                  <div className="log-header">
                    <div className="log-status">
                      {log.status === 'success' && <CheckCircle size={16} color="#30d158" />}
                      {log.status === 'error' && <XCircle size={16} color="#ff3b30" />}
                      {log.status === 'running' && <Loader size={16} color="#007aff" className="spinning" />}
                    </div>
                    <div className="log-time">
                      {formatDate(log.startTime)}
                    </div>
                    {log.duration && (
                      <div className="log-duration">
                        {log.duration}ms
                      </div>
                    )}
                  </div>
                  
                  {log.output && (
                    <div className="log-output">
                      <strong>Output:</strong>
                      <pre>{log.output}</pre>
                    </div>
                  )}
                  
                  {log.error && (
                    <div className="log-error">
                      <strong>Lỗi:</strong>
                      <pre>{log.error}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="form-group">
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap',
          marginTop: '20px'
        }}>
          <button
            className="btn btn-secondary"
            onClick={handleTestCommand}
            disabled={testing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {testing ? (
              <>
                <div className="loading" style={{ width: '14px', height: '14px' }}></div>
                Đang test...
              </>
            ) : (
              <>
                <TestTube size={14} />
                Test lệnh
              </>
            )}
          </button>

          {job.runMode === 'background' && (
            <button
              className="btn btn-secondary"
              onClick={handleViewLogs}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={14} />
              Xem Log
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => onEditJob(job)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={14} />
            Chỉnh sửa
          </button>

          <button
            className="btn btn-danger"
            onClick={() => onDeleteJob(job.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} />
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}

export default JobDetails
