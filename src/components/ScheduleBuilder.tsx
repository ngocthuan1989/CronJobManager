import React, { useState, useEffect, useRef } from 'react'
import { Clock, Calendar, Repeat, Settings } from 'lucide-react'

interface ScheduleBuilderProps {
  value: string
  onChange: (schedule: string) => void
}

type ScheduleMode = 'daily' | 'weekly' | 'monthly' | 'interval'

interface ScheduleConfig {
  mode: ScheduleMode
  time: { hour: number; minute: number }
  days: number[] // 0=CN, 1=T2, 2=T3, ..., 6=T7
  dayOfMonth: number
  interval: { value: number; unit: 'minute' | 'hour' | 'day' }
}

function ScheduleBuilder({ value, onChange }: ScheduleBuilderProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    mode: 'daily',
    time: { hour: 9, minute: 0 },
    days: [1, 2, 3, 4, 5], // T2-T6 mặc định
    dayOfMonth: 1,
    interval: { value: 1, unit: 'hour' }
  })

  const isInitialized = useRef(false)

  // Parse cron expression thành config
  useEffect(() => {
    if (value && !isInitialized.current) {
      const parsed = parseCronExpression(value)
      if (parsed) {
        setConfig(parsed)
        isInitialized.current = true
      }
    }
  }, [value])

  // Generate cron expression từ config
  useEffect(() => {
    if (isInitialized.current) {
      const cronExpression = generateCronExpression(config)
      if (cronExpression !== value) {
        onChange(cronExpression)
      }
    }
  }, [config, value])

  const parseCronExpression = (cron: string): ScheduleConfig | null => {
    const parts = cron.split(' ')
    if (parts.length !== 5) return null

    const [minute, hour, day, month, weekday] = parts

    // Parse các loại lịch trình
    if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
      // Hàng ngày: 0 9 * * *
      return {
        mode: 'daily',
        time: { hour: parseInt(hour) || 0, minute: parseInt(minute) || 0 },
        days: [],
        dayOfMonth: 1,
        interval: { value: 1, unit: 'hour' }
      }
    } else if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday !== '*') {
      // Hàng tuần: 0 9 * * 1,2,3,4,5
      const weekDays = weekday.split(',').map(d => parseInt(d)).filter(d => !isNaN(d))
      return {
        mode: 'weekly',
        time: { hour: parseInt(hour) || 0, minute: parseInt(minute) || 0 },
        days: weekDays,
        dayOfMonth: 1,
        interval: { value: 1, unit: 'hour' }
      }
    } else if (minute !== '*' && hour !== '*' && day !== '*' && month === '*' && weekday === '*') {
      // Hàng tháng: 0 9 1 * *
      return {
        mode: 'monthly',
        time: { hour: parseInt(hour) || 0, minute: parseInt(minute) || 0 },
        days: [],
        dayOfMonth: parseInt(day) || 1,
        interval: { value: 1, unit: 'hour' }
      }
    } else if (minute.includes('/') || hour.includes('/')) {
      // Khoảng thời gian: */5 * * * * hoặc 0 */1 * * *
      if (minute.includes('/')) {
        const intervalValue = parseInt(minute.split('/')[1]) || 1
        return {
          mode: 'interval',
          time: { hour: 0, minute: 0 },
          days: [],
          dayOfMonth: 1,
          interval: { value: intervalValue, unit: 'minute' }
        }
      } else if (hour.includes('/')) {
        const intervalValue = parseInt(hour.split('/')[1]) || 1
        return {
          mode: 'interval',
          time: { hour: 0, minute: 0 },
          days: [],
          dayOfMonth: 1,
          interval: { value: intervalValue, unit: 'hour' }
        }
      }
    }

    // Default
    return {
      mode: 'daily',
      time: { hour: 9, minute: 0 },
      days: [],
      dayOfMonth: 1,
      interval: { value: 1, unit: 'hour' }
    }
  }

  const generateCronExpression = (config: ScheduleConfig): string => {
    switch (config.mode) {
      case 'daily':
        return `${config.time.minute} ${config.time.hour} * * *`
      
      case 'weekly':
        if (config.days.length === 0) return `${config.time.minute} ${config.time.hour} * * *`
        return `${config.time.minute} ${config.time.hour} * * ${config.days.join(',')}`
      
      case 'monthly':
        return `${config.time.minute} ${config.time.hour} ${config.dayOfMonth} * *`
      
      case 'interval':
        if (config.interval.unit === 'minute') {
          return `*/${config.interval.value} * * * *`
        } else if (config.interval.unit === 'hour') {
          return `0 */${config.interval.value} * * *`
        } else if (config.interval.unit === 'day') {
          return `0 0 */${config.interval.value} * *`
        }
        return `${config.time.minute} ${config.time.hour} * * *`
      
      default:
        return `${config.time.minute} ${config.time.hour} * * *`
    }
  }

  const getScheduleDescription = (config: ScheduleConfig): string => {
    switch (config.mode) {
      case 'daily':
        return `Hàng ngày lúc ${config.time.hour.toString().padStart(2, '0')}:${config.time.minute.toString().padStart(2, '0')}`
      
      case 'weekly':
        if (config.days.length === 0) return 'Chưa chọn ngày trong tuần'
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
        const selectedDays = config.days.map(d => dayNames[d]).join(', ')
        return `Hàng tuần vào ${selectedDays} lúc ${config.time.hour.toString().padStart(2, '0')}:${config.time.minute.toString().padStart(2, '0')}`
      
      case 'monthly':
        return `Hàng tháng vào ngày ${config.dayOfMonth} lúc ${config.time.hour.toString().padStart(2, '0')}:${config.time.minute.toString().padStart(2, '0')}`
      
      case 'interval':
        if (config.interval.unit === 'minute') {
          return `Mỗi ${config.interval.value} phút`
        } else if (config.interval.unit === 'hour') {
          return `Mỗi ${config.interval.value} giờ`
        } else if (config.interval.unit === 'day') {
          return `Mỗi ${config.interval.value} ngày`
        }
        return 'Khoảng thời gian'
      
      default:
        return 'Chưa thiết lập'
    }
  }

  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  const dayShortNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  return (
    <div className="schedule-builder">
      <div className="schedule-header">
        <h4>
          <Clock size={16} />
          Thiết lập lịch trình
        </h4>
      </div>

      {/* Schedule Mode Selection */}
      <div className="schedule-mode-selection">
        <div className="mode-options">
          <label className={`mode-option ${config.mode === 'daily' ? 'active' : ''}`}>
            <input
              type="radio"
              name="scheduleMode"
              value="daily"
              checked={config.mode === 'daily'}
              onChange={(e) => setConfig(prev => ({ ...prev, mode: e.target.value as ScheduleMode }))}
            />
            <div className="mode-content">
              <Calendar size={20} />
              <span>Hàng ngày</span>
            </div>
          </label>

          <label className={`mode-option ${config.mode === 'weekly' ? 'active' : ''}`}>
            <input
              type="radio"
              name="scheduleMode"
              value="weekly"
              checked={config.mode === 'weekly'}
              onChange={(e) => setConfig(prev => ({ ...prev, mode: e.target.value as ScheduleMode }))}
            />
            <div className="mode-content">
              <Repeat size={20} />
              <span>Hàng tuần</span>
            </div>
          </label>

          <label className={`mode-option ${config.mode === 'monthly' ? 'active' : ''}`}>
            <input
              type="radio"
              name="scheduleMode"
              value="monthly"
              checked={config.mode === 'monthly'}
              onChange={(e) => setConfig(prev => ({ ...prev, mode: e.target.value as ScheduleMode }))}
            />
            <div className="mode-content">
              <Calendar size={20} />
              <span>Hàng tháng</span>
            </div>
          </label>

          <label className={`mode-option ${config.mode === 'interval' ? 'active' : ''}`}>
            <input
              type="radio"
              name="scheduleMode"
              value="interval"
              checked={config.mode === 'interval'}
              onChange={(e) => setConfig(prev => ({ ...prev, mode: e.target.value as ScheduleMode }))}
            />
            <div className="mode-content">
              <Settings size={20} />
              <span>Khoảng thời gian</span>
            </div>
          </label>
        </div>
      </div>

      {/* Time Selection */}
      {(config.mode === 'daily' || config.mode === 'weekly' || config.mode === 'monthly') && (
        <div className="time-selection">
          <label>Thời gian:</label>
          <div className="time-inputs">
            <input
              type="number"
              min="0"
              max="23"
              value={config.time.hour}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                time: { ...prev.time, hour: parseInt(e.target.value) || 0 }
              }))}
              className="time-input"
            />
            <span>:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={config.time.minute}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                time: { ...prev.time, minute: parseInt(e.target.value) || 0 }
              }))}
              className="time-input"
            />
          </div>
        </div>
      )}

      {/* Weekly Day Selection */}
      {config.mode === 'weekly' && (
        <div className="day-selection">
          <label>Ngày trong tuần:</label>
          <div className="day-toggle-group">
            {dayNames.map((dayName, index) => (
              <button
                key={index}
                type="button"
                className={`day-toggle-btn ${config.days.includes(index) ? 'active' : ''}`}
                onClick={() => {
                  if (config.days.includes(index)) {
                    setConfig(prev => ({
                      ...prev,
                      days: prev.days.filter(d => d !== index)
                    }))
                  } else {
                    setConfig(prev => ({
                      ...prev,
                      days: [...prev.days, index]
                    }))
                  }
                }}
              >
                <span className="day-short">{dayShortNames[index]}</span>
                <span className="day-full">{dayName}</span>
              </button>
            ))}
          </div>
          
          {/* Quick presets for days */}
          <div className="day-presets">
            <button
              type="button"
              className="day-preset-btn"
              onClick={() => setConfig(prev => ({ ...prev, days: [1, 2, 3, 4, 5] }))}
            >
              <span className="preset-icon">💼</span>
              Ngày làm việc
            </button>
            <button
              type="button"
              className="day-preset-btn"
              onClick={() => setConfig(prev => ({ ...prev, days: [6, 0] }))}
            >
              <span className="preset-icon">🏖️</span>
              Cuối tuần
            </button>
            <button
              type="button"
              className="day-preset-btn"
              onClick={() => setConfig(prev => ({ ...prev, days: [0, 1, 2, 3, 4, 5, 6] }))}
            >
              <span className="preset-icon">📅</span>
              Cả tuần
            </button>
          </div>
        </div>
      )}

      {/* Monthly Day Selection */}
      {config.mode === 'monthly' && (
        <div className="monthly-selection">
          <label>Ngày trong tháng:</label>
          <input
            type="number"
            min="1"
            max="31"
            value={config.dayOfMonth}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              dayOfMonth: parseInt(e.target.value) || 1
            }))}
            className="day-input"
          />
          <span className="help-text">(1-31)</span>
        </div>
      )}

      {/* Interval Selection */}
      {config.mode === 'interval' && (
        <div className="interval-selection">
          <label>Khoảng thời gian:</label>
          <div className="interval-inputs">
            <span>Mỗi</span>
            <input
              type="number"
              min="1"
              max="59"
              value={config.interval.value}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                interval: { ...prev.interval, value: parseInt(e.target.value) || 1 }
              }))}
              className="interval-value-input"
            />
            <select
              value={config.interval.unit}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                interval: { ...prev.interval, unit: e.target.value as 'minute' | 'hour' | 'day' }
              }))}
              className="interval-unit-select"
            >
              <option value="minute">phút</option>
              <option value="hour">giờ</option>
              <option value="day">ngày</option>
            </select>
          </div>
        </div>
      )}

      {/* Schedule Preview */}
      <div className="schedule-preview">
        <Calendar size={14} />
        <span style={{ marginLeft: '8px' }}>
          {getScheduleDescription(config)}
        </span>
      </div>
    </div>
  )
}

export default ScheduleBuilder
