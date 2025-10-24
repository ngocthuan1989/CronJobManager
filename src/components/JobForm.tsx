import React, { useState } from 'react'
import { Save, X, TestTube, FileText, Volume2 } from 'lucide-react'
import { CronJobData, AudioNotificationConfig } from '../App'
import ScheduleBuilder from './ScheduleBuilder'

interface JobFormProps {
  job: CronJobData | null
  onSave: (job: CronJobData) => void
  onCancel: () => void
}

function JobForm({ job, onSave, onCancel }: JobFormProps) {
  const [formData, setFormData] = useState<Partial<CronJobData>>({
    name: job?.name || '',
    command: job?.command || '',
    schedule: job?.schedule || '0 9 * * *',
    description: job?.description || '',
    enabled: job?.enabled ?? true,
    runMode: job?.runMode || 'background', // Default to background mode
    audioNotification: job?.audioNotification || {
      enabled: false,
      type: 'system',
      systemSound: 'Glass',
      ttsText: 'Job completed',
      audioFilePath: '',
      playOnSuccess: true,
      playOnError: true
    }
  })
  
  const [testResult, setTestResult] = useState<{ success: boolean; output: string; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [availableSystemSounds, setAvailableSystemSounds] = useState<string[]>([])

  // Load available system sounds on component mount
  React.useEffect(() => {
    const loadSystemSounds = async () => {
      try {
        const sounds = await (window as any).electronAPI.getAvailableSystemSounds()
        setAvailableSystemSounds(sounds)
      } catch (error) {
        console.error('Error loading system sounds:', error)
      }
    }
    loadSystemSounds()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.command || !formData.schedule) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    const jobData: CronJobData = {
      id: job?.id || Date.now().toString(),
      name: formData.name!,
      command: formData.command!,
      schedule: formData.schedule!,
      description: formData.description,
      enabled: formData.enabled!,
      runMode: formData.runMode || 'background',
      audioNotification: formData.audioNotification
    }

    onSave(jobData)
  }

  const handleTestCommand = async () => {
    if (!formData.command) {
      alert('Vui lòng nhập lệnh để test')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const result = await (window as any).electronAPI.testJob(formData.command, formData.audioNotification)
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

  const handleSelectFile = async () => {
    try {
      const filePath = await (window as any).electronAPI.selectFile()
      if (filePath) {
        setFormData(prev => ({
          ...prev,
          command: filePath
        }))
      }
    } catch (error) {
      console.error('Error selecting file:', error)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            <FileText size={20} />
            {job ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}
          </h3>
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên công việc *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ví dụ: Backup database hàng ngày"
              required
            />
          </div>

          <div className="form-group">
            <label>Lệnh thực thi *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={formData.command || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                placeholder="/Library/Frameworks/Python.framework/Versions/3.11/bin/python3 /path/to/script.py"
                style={{ flex: 1 }}
                required
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSelectFile}
                title="Chọn file"
              >
                <FileText size={16} />
              </button>
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#8e8e93', 
              marginTop: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div><strong>Ví dụ Python:</strong></div>
              <div>/Library/Frameworks/Python.framework/Versions/3.11/bin/python3 /Users/buithuan/DULIEU/Congviec/Python/WebThuanCK/backend/data/QuetGiaKLCoPhieu.py</div>
              <div><strong>Ví dụ Shell:</strong></div>
              <div>/bin/bash /path/to/script.sh</div>
              <div><strong>Ví dụ Node.js:</strong></div>
              <div>node /path/to/script.js</div>
            </div>
            
            {/* Quick Command Presets */}
            <div style={{ 
              marginTop: '8px',
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 8px',
                  height: 'auto'
                }}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  command: '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3 /Users/buithuan/DULIEU/Congviec/Python/WebThuanCK/backend/data/QuetGiaKLCoPhieu.py'
                }))}
              >
                🐍 Python Script
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 8px',
                  height: 'auto'
                }}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  command: '/bin/bash /path/to/your/script.sh'
                }))}
              >
                🐚 Shell Script
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 8px',
                  height: 'auto'
                }}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  command: 'node /path/to/your/script.js'
                }))}
              >
                📦 Node.js Script
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 8px',
                  height: 'auto'
                }}
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  command: '/usr/bin/python3 /path/to/your/script.py'
                }))}
              >
                🐍 System Python
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Lịch trình *</label>
            <ScheduleBuilder
              value={formData.schedule || ''}
              onChange={(schedule) => setFormData(prev => ({ ...prev, schedule }))}
            />
          </div>

          <div className="form-group">
            <label>Mô tả</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả chi tiết về công việc này..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '0',
              fontWeight: '500',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={formData.enabled || false}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                style={{ margin: '0', width: 'auto' }}
              />
              Kích hoạt công việc này
            </label>
          </div>

          <div className="form-group">
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '0',
              fontWeight: '500',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={formData.runMode === 'terminal'}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  runMode: e.target.checked ? 'terminal' : 'background' 
                }))}
                style={{ margin: '0', width: 'auto' }}
              />
              Mở Terminal khi chạy (nếu không chọn sẽ chạy ngầm)
            </label>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginTop: '4px',
              marginLeft: '24px'
            }}>
              • <strong>Chạy ngầm:</strong> Job chạy trong background, có thể xem log<br/>
              • <strong>Mở Terminal:</strong> Job sẽ mở cửa sổ Terminal mới để bạn thấy quá trình thực thi
            </div>
          </div>

          {/* Audio Notification Configuration */}
          <div className="form-group">
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={formData.audioNotification?.enabled || false}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  audioNotification: {
                    ...prev.audioNotification!,
                    enabled: e.target.checked
                  }
                }))}
                style={{ margin: '0', width: 'auto' }}
              />
              <Volume2 size={16} />
              Thông báo âm thanh khi hoàn thành
            </label>
            
            {formData.audioNotification?.enabled && (
              <div style={{ 
                marginLeft: '24px',
                padding: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Audio Type Selection */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                    Loại âm thanh:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="audioType"
                        value="system"
                        checked={formData.audioNotification?.type === 'system'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audioNotification: {
                            ...prev.audioNotification!,
                            type: e.target.value as 'system'
                          }
                        }))}
                      />
                      System Sound
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="audioType"
                        value="tts"
                        checked={formData.audioNotification?.type === 'tts'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audioNotification: {
                            ...prev.audioNotification!,
                            type: e.target.value as 'tts'
                          }
                        }))}
                      />
                      Text-to-Speech
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="audioType"
                        value="file"
                        checked={formData.audioNotification?.type === 'file'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audioNotification: {
                            ...prev.audioNotification!,
                            type: e.target.value as 'file'
                          }
                        }))}
                      />
                      Audio File
                    </label>
                  </div>
                </div>

                {/* System Sound Selection */}
                {formData.audioNotification?.type === 'system' && (
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                      System Sound:
                    </label>
                    <select
                      value={formData.audioNotification?.systemSound || 'Glass'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        audioNotification: {
                          ...prev.audioNotification!,
                          systemSound: e.target.value
                        }
                      }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      {availableSystemSounds.map(sound => (
                        <option key={sound} value={sound}>{sound}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* TTS Text Input */}
                {formData.audioNotification?.type === 'tts' && (
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                      Text để đọc:
                    </label>
                    <input
                      type="text"
                      value={formData.audioNotification?.ttsText || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        audioNotification: {
                          ...prev.audioNotification!,
                          ttsText: e.target.value
                        }
                      }))}
                      placeholder="Job completed successfully"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}

                {/* Audio File Selection */}
                {formData.audioNotification?.type === 'file' && (
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                      Audio File:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={formData.audioNotification?.audioFilePath || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audioNotification: {
                            ...prev.audioNotification!,
                            audioFilePath: e.target.value
                          }
                        }))}
                        placeholder="/path/to/audio/file.mp3"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={async () => {
                          try {
                            const filePath = await (window as any).electronAPI.selectFile()
                            if (filePath) {
                              setFormData(prev => ({
                                ...prev,
                                audioNotification: {
                                  ...prev.audioNotification!,
                                  audioFilePath: filePath
                                }
                              }))
                            }
                          } catch (error) {
                            console.error('Error selecting audio file:', error)
                          }
                        }}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Play Options */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                    Phát âm thanh khi:
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={formData.audioNotification?.playOnSuccess || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audioNotification: {
                            ...prev.audioNotification!,
                            playOnSuccess: e.target.checked
                          }
                        }))}
                      />
                      Thành công
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={formData.audioNotification?.playOnError || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          audioNotification: {
                            ...prev.audioNotification!,
                            playOnError: e.target.checked
                          }
                        }))}
                      />
                      Lỗi
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {formData.command && testResult && (
            <div className="form-group">
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

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              <X size={14} />
              Hủy
            </button>
            
            {formData.command && (
              <button
                type="button"
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
            )}
            
            <button type="submit" className="btn btn-primary">
              <Save size={14} />
              {job ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JobForm
