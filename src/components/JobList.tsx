import { Play, Pause, Edit3, Trash2, Copy } from 'lucide-react'
import { CronJobData } from '../App'

interface JobListProps {
  jobs: CronJobData[]
  selectedJob: CronJobData | null
  onSelectJob: (job: CronJobData) => void
  onEditJob: (job: CronJobData) => void
  onDeleteJob: (id: string) => void
  onToggleJob: (id: string) => void
  onDuplicateJob: (job: CronJobData) => void
}

function JobList({ 
  jobs, 
  selectedJob, 
  onSelectJob, 
  onEditJob, 
  onDeleteJob, 
  onToggleJob,
  onDuplicateJob
}: JobListProps) {
  const formatSchedule = (schedule: string) => {
    const scheduleMap: { [key: string]: string } = {
      '0 0 * * *': 'Hàng ngày lúc 00:00',
      '0 9 * * *': 'Hàng ngày lúc 09:00',
      '0 18 * * *': 'Hàng ngày lúc 18:00',
      '0 0 * * 1': 'Hàng tuần (Thứ 2)',
      '0 0 1 * *': 'Hàng tháng (Ngày 1)',
      '*/5 * * * *': 'Mỗi 5 phút',
      '*/15 * * * *': 'Mỗi 15 phút',
      '*/30 * * * *': 'Mỗi 30 phút',
      '0 */1 * * *': 'Mỗi giờ',
      '0 */2 * * *': 'Mỗi 2 giờ',
      '0 */6 * * *': 'Mỗi 6 giờ',
      '0 */12 * * *': 'Mỗi 12 giờ'
    }
    
    return scheduleMap[schedule] || schedule
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

  return (
    <div className="sidebar">
      <h3>Công việc ({jobs.length})</h3>
      
      <div className="job-list">
        {jobs.map(job => (
          <div
            key={job.id}
            className={`job-item ${selectedJob?.id === job.id ? 'active' : ''} ${!job.enabled ? 'disabled' : ''}`}
            onClick={() => onSelectJob(job)}
          >
            <div className="job-status" style={{ 
              backgroundColor: job.enabled ? '#10b981' : '#ef4444' 
            }}></div>
            
            <div className="job-name">{job.name}</div>
            <div className="job-schedule">{formatSchedule(job.schedule)}</div>
            
            {job.nextRun && (
              <div style={{ 
                fontSize: '11px', 
                color: '#9ca3af', 
                marginTop: '4px' 
              }}>
                {getNextRunText(job.nextRun)}
              </div>
            )}
            
            <div 
              className="job-actions"
              style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '8px',
                opacity: 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              <button
                className="btn btn-secondary"
                style={{ 
                  padding: '6px 8px', 
                  fontSize: '11px',
                  minWidth: 'auto',
                  height: 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleJob(job.id)
                }}
                title={job.enabled ? 'Tạm dừng' : 'Kích hoạt'}
              >
                {job.enabled ? <Pause size={10} /> : <Play size={10} />}
              </button>
              
              <button
                className="btn btn-secondary"
                style={{ 
                  padding: '6px 8px', 
                  fontSize: '11px',
                  minWidth: 'auto',
                  height: 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onEditJob(job)
                }}
                title="Chỉnh sửa"
              >
                <Edit3 size={10} />
              </button>
              
              <button
                className="btn btn-info"
                style={{ 
                  padding: '6px 8px', 
                  fontSize: '11px',
                  minWidth: 'auto',
                  height: 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicateJob(job)
                }}
                title="Nhân bản"
              >
                <Copy size={10} />
              </button>
              
              <button
                className="btn btn-danger"
                style={{ 
                  padding: '6px 8px', 
                  fontSize: '11px',
                  minWidth: 'auto',
                  height: 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Bạn có chắc muốn xóa công việc này?')) {
                    onDeleteJob(job.id)
                  }
                }}
                title="Xóa"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
        
        {jobs.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#9ca3af'
          }}>
            <p>Chưa có công việc nào</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Nhấn "Thêm công việc" để bắt đầu
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default JobList
