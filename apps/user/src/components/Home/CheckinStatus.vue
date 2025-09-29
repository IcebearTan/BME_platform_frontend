<template>
  <div class="checkin-status" :class="{ 'theme-dark': isDarkMode }">
    <!-- 统一的计时器显示 -->
    <div class="study-timer-expanded" v-if="checkinInfo.checkedIn && !checkinInfo.checkedOut">
      <div class="timer-display-expanded" :class="{ 'overtime-warning': checkinInfo.isOvertime }">
        <span class="timer-text" :class="{ 'overtime-text': checkinInfo.isOvertime }">
          {{ checkinInfo.isOvertime ? '⚠️ 学习超时' : '学习时长' }}
        </span>
        <div class="timer-value-expanded" :class="{ 'overtime-value': checkinInfo.isOvertime }">
          {{ currentStudyDuration }}
        </div>
        <div v-if="checkinInfo.isOvertime" class="overtime-message">
          请尽快签退并适当休息
        </div>
      </div>
    </div>

    <!-- 统一的打卡按钮区域 -->
    <div class="checkin-actions">
      <!-- 未开始学习时 -->
      <div
        v-if="!checkinInfo.checkedIn && !checkinInfo.checkedOut"
        class="status-display expanded-status"
        :class="{ 
          'status-jelly-hover': isHovering
        }"
        @click="requestCheckin()"
        @mouseenter="startHoverAnimation()"
        @mouseleave="endHoverAnimation()">
        <div class="status-content-wrapper">
          <div class="status-content content-switching">
            <!-- 提示文本 -->
            <div class="status-info" :class="{ 'info-hidden': isHovering }">
              <span class="status-text">点击开始</span>
              <span class="status-icon">▶</span>
            </div>
            <!-- 开始学习按钮显示 -->
            <div class="status-button" :class="{ 'button-visible': isHovering }">
              <span class="button-text">开始学习</span>
              <div class="button-icon">●</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 正在学习时 -->
      <div
        v-else-if="checkinInfo.checkedIn && !checkinInfo.checkedOut"
        class="status-display expanded-status danger-style"
        :class="{ 
          'status-jelly-hover': isHovering
        }"
        @click="requestCheckout()"
        @mouseenter="startHoverAnimation()"
        @mouseleave="endHoverAnimation()">
        <div class="status-content-wrapper">
          <div class="status-content content-switching">
            <!-- 提示文本 -->
            <div class="status-info" :class="{ 'info-hidden': isHovering }">
              <span class="status-text">正在学习中</span>
              <span class="status-icon">⏸</span>
            </div>
            <!-- 结束学习按钮显示 -->
            <div class="status-button" :class="{ 'button-visible': isHovering }">
              <span class="button-text">结束学习</span>
              <div class="button-icon">●</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 已完成学习时 -->
      <div
        v-else
        class="status-display expanded-status completed-style"
        :class="{ 
          'status-jelly-hover': completedHovering
        }"
        @click="requestCheckin()"
        @mouseenter="startCompletedHover()"
        @mouseleave="endCompletedHover()">
        <div class="status-content-wrapper">
          <div class="status-content content-switching">
            <!-- 累计时长显示 -->
            <div class="status-info" :class="{ 'info-hidden': completedHovering }">
              <span class="status-text" v-if="todayTotalDuration && todayTotalDuration !== '0m'">
                今日已累计：{{ todayTotalDuration }}
              </span>
              <span class="status-text" v-else>
                今日还未打卡哦
              </span>
            </div>
            <!-- 开始学习按钮显示 -->
            <div class="status-button" :class="{ 'button-visible': completedHovering }">
              <span class="button-text">开始学习</span>
              <div class="button-icon">●</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, h, nextTick } from 'vue'
import { ElButton, ElDialog, ElMessage, ElMessageBox } from 'element-plus'
import api from '../../api'

// Props
const props = defineProps({
  // 主题模式
  isDarkMode: {
    type: Boolean,
    default: false
  },
  // 折叠状态
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

// Emits - 现在CheckinStatus自己管理，不需要emit事件了
// const emit = defineEmits(['checkin', 'checkout', 'request-checkin', 'request-checkout'])

// 响应式数据
const loading = ref(false)
const studyStartTime = ref(null)
const currentStudyDuration = ref('00:00:00') // 实时计时用原格式
const isHovering = ref(false)
const completedHovering = ref(false)
const todayTotalDuration = ref('0m') // 今日总时长用新格式
const checkinHistory = ref([]) // 今日签到历史记录

// 新增的签到相关状态
const todayRecord = ref({}) // 今日打卡记录
const formeCheckStatus = ref([]) // 历史记录，用于计算累计时长
const isVisible = ref(false) // 是否显示签退界面
const checkTime = ref(null) // 签到时间
const hasShownOvertimeWarning = ref(false) // 是否已显示超时警告
const hasShownSevereOvertimeWarning = ref(false) // 是否已显示严重超时警告
const nowTime = ref(new Date())

// 登录检查
const checkLogin = () => {
  const token = localStorage.getItem('token')
  return !!token
}

// 获取今日最新打卡状态
const fetchLatestCheckTime = async () => {
  if (!checkLogin()) return null
  
  try {
    const res = await api({
      url: '/lateset_checktime',
      method: 'get'
    })
    return res.data
  } catch (error) {
    console.error('获取今日最新打卡状态失败:', error)
    return null
  }
}

// 获取最新打卡状态并更新界面
const getLatesetCheckStatus = async () => {
  todayRecord.value = await fetchLatestCheckTime()
  
  if (!todayRecord.value) {
    checkinInfo.value.checkedIn = false
    checkinInfo.value.checkedOut = false
    return
  }
  
  // 基于服务器数据更新CheckinStatus状态
  if (todayRecord.value.has_record && todayRecord.value.check_in_time) {
    if (!todayRecord.value.check_out_time) {
      // 已签到但未签退
      checkinInfo.value.checkedIn = true
      checkinInfo.value.checkedOut = false
      checkinInfo.value.checkinTime = todayRecord.value.check_in_time
      checkinInfo.value.checkinTimestamp = new Date(todayRecord.value.check_in_time).getTime()
      checkTime.value = new Date(todayRecord.value.check_in_time)
      
      // 启动计时器 - 总是使用服务器的签到时间作为基准
      if (!studyTimer) {
        studyStartTime.value = todayRecord.value.check_in_time
        studyTimer = setInterval(() => {
          updateStudyDuration()
          checkOvertimeWarning() // 检查超时
        }, 1000)
        updateStudyDuration()
      }
    } else {
      // 已签到且已签退
      checkinInfo.value.checkedIn = false
      checkinInfo.value.checkedOut = true
      checkinInfo.value.checkoutTime = todayRecord.value.check_out_time
    }
  } else {
    // 没有打卡记录
    checkinInfo.value.checkedIn = false
    checkinInfo.value.checkedOut = false
  }
}

// 检查是否超时未签退（超过6小时）
const isOvertime = () => {
  if (!todayRecord.value || !todayRecord.value.check_in_time || todayRecord.value.check_out_time) {
    return false // 未签到或已签退
  }
  
  const checkInTime = new Date(todayRecord.value.check_in_time)
  const diffHours = (nowTime.value - checkInTime) / (1000 * 60 * 60)
  
  return diffHours > 6 // 超过6小时
}

// 检查并显示超时提示
const checkOvertimeWarning = () => {
  // 更新超时状态
  checkinInfo.value.isOvertime = isOvertime()
  
  if (isOvertime() && !hasShownOvertimeWarning.value) {
    hasShownOvertimeWarning.value = true
    
    ElMessageBox({
      type: 'error',
      message: '⚠️ 学习时长已超过6小时，本次签到记录无效，请尽快签退！长时间学习记得适当休息哦～',
      duration: 10000,
      showClose: true,
      lockScroll: false,
    })
    
    setTimeout(() => {
      if (isOvertime() && !hasShownSevereOvertimeWarning.value) {
        hasShownSevereOvertimeWarning.value = true
        ElMessageBox({
          type: 'error',
          message: '🚨 学习时长严重超时！请立即签退并注意休息！',
          duration: 15000,
          showClose: true,
          lockScroll: false,
        })
      }
    }, 5 * 60 * 1000)
  }
  
  if (todayRecord.value?.check_out_time) {
    hasShownOvertimeWarning.value = false
    hasShownSevereOvertimeWarning.value = false
  }
}

// 提交签到
const submitCheckCode = async (code) => {
  try {
    const res = await api({
      url: '/check',
      method: 'post',
      data: {
        'check_code': code
      }
    })
    if (res.status === 200) {
      ElMessage({
        type: 'success',
        message: '签到成功！请在6小时内签退！',
      })

      // 更新签到状态，但不重新获取最新状态（避免覆盖计时器）
      checkinInfo.value.checkedIn = true
      checkinInfo.value.checkedOut = false
      checkinInfo.value.checkinTime = new Date().toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
      checkinInfo.value.checkinTimestamp = new Date().getTime()
      
      hasShownOvertimeWarning.value = false
      hasShownSevereOvertimeWarning.value = false
      return true
    }
  } catch (error) {
    if (error?.response?.status === 409) {
      ElMessage({
        type: 'error',
        message: '签到码已被使用',
      })
    } else if (error?.response?.status === 403) {
      ElMessage({
        type: 'error',
        message: 'IP不在106或110网段，请连接正确的网络后重试',
      })
    } else {
      ElMessage({
        type: 'error',
        message: error?.response?.data?.message || error,
      })
    }
    throw error
  }
}

// 提交签退
const submitCheckOutCode = async (code) => {
  try {
    const res = await api({
      url: '/check',
      method: 'post',
      data: {
        'check_code': code
      }
    })
    if (res.status === 200) {
      ElMessage({
        type: 'success',
        message: '签退成功！',
      })

      // 在重新获取状态前，先保存当前这次的学习记录到历史（作为备用）
      const currentSessionData = {
        checkedIn: true,
        checkedOut: true,
        checkinTime: checkinInfo.value.checkinTime,
        checkinTimestamp: checkinInfo.value.checkinTimestamp,
        checkoutTime: new Date().toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }),
        studyDuration: currentStudyDuration.value,
        isOvertime: checkinInfo.value.isOvertime
      }
      
      // 保存这次的签到记录到历史（作为备用数据）
      saveCheckinToHistory(currentSessionData)
      
      // 停止计时器
      if (studyTimer) {
        clearInterval(studyTimer)
        studyTimer = null
      }
      
      // 重新获取最新状态
      await getLatesetCheckStatus()
      
      // 使用基于API的方法重新计算今日总时长
      await calculateTodayTotalDuration()
      
      hasShownOvertimeWarning.value = false
      hasShownSevereOvertimeWarning.value = false
      return true
    }
  } catch (error) {
    if (error?.response?.status === 409) {
      ElMessage({
        type: 'error',
        message: '签退码已被使用',
      })
    } else if (error?.response?.status === 403) {
      ElMessage({
        type: 'error',
        message: 'IP不在106或110网段，请连接正确的网络后重试',
      })
    } else {
      ElMessage({
        type: 'error',
        message: error?.response?.data?.message || error,
      })
    }
    throw error
  }
}

// 签到状态管理 - CheckinStatus 自己维护
const checkinInfo = ref({
  checkedIn: false,
  checkedOut: false,
  checkinTime: null,
  checkinTimestamp: null,
  checkoutTime: null,
  location: null,
  studyDuration: null,
  isOvertime: false
})

// 动画控制方法
const startHoverAnimation = () => {
  isHovering.value = true
}

const endHoverAnimation = () => {
  isHovering.value = false
}

// 展开状态完成区域的hover控制
const startCompletedHover = () => {
  completedHovering.value = true
}

const endCompletedHover = () => {
  completedHovering.value = false
}

// 定时器
let studyTimer = null

// 计算学习时长
const updateStudyDuration = () => {
  if (!studyStartTime.value) return
  
  const now = new Date()
  const startTime = new Date(studyStartTime.value)
  
  // 计算从开始时间到现在的时长差
  const diff = now - startTime
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  // 保持原来的 "xx:xx:xx" 格式用于实时计时显示
  currentStudyDuration.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 格式化时长字符串为秒数（支持 "xxh xxm" 和 "xx:xx:xx" 两种格式）
const parseDurationToSeconds = (durationStr) => {
  if (!durationStr || durationStr === '00:00:00' || durationStr === '0m') return 0
  
  // 处理新格式："xxh xxm" 或 "xxm"（用于累计时长）
  if (durationStr.includes('h') || (durationStr.includes('m') && !durationStr.includes(':'))) {
    const hourMatch = durationStr.match(/(\d+)h/)
    const minuteMatch = durationStr.match(/(\d+)m/)
    
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
    
    return hours * 3600 + minutes * 60
  }
  
  // 处理原格式："xx:xx:xx"（用于实时计时）
  const parts = durationStr.split(':')
  if (parts.length === 3) {
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    return hours * 3600 + minutes * 60 + seconds
  }
  return 0
}

// 格式化秒数为时长字符串（xxh xxm 格式，向下取整）
const formatSecondsToTimeDuration = (totalSeconds) => {
  if (totalSeconds <= 0) return '0m'
  
  const hours = Math.floor(totalSeconds / 3600) // 向下取整小时数
  const minutes = Math.floor((totalSeconds % 3600) / 60) // 向下取整分钟数
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

// 计算今日总时长 - 基于服务器API数据，不再依赖本地localStorage
const calculateTodayTotalDuration = async () => {
  // 获取今日日期字符串，放在函数开始处确保全局可用
  const today = new Date().toISOString().split('T')[0]
  
  try {
    // 获取历史记录数据
    const recordsRes = await api({
      url: '/records',
      method: 'get'
    })
    
    if (recordsRes.status === 200 && recordsRes.data) {
      // 从 current_month.records 和 previous_month.records 中查找今日记录
      const allRecords = [
        ...(recordsRes.data.current_month?.records || []),
        ...(recordsRes.data.previous_month?.records || [])
      ]
      
      const todayRecord = allRecords.find(record => record.date === today)
      
      if (todayRecord && todayRecord.total_hours) {
        // 如果有今日记录，直接使用服务器提供的总时长
        const formatted = formatHoursToTimeDuration(todayRecord.total_hours)
        todayTotalDuration.value = formatted
        return
      }
    }
    
    // 如果没有历史记录，尝试从最新状态获取
    const latestRes = await api({
      url: '/lateset_checktime',
      method: 'get'
    })
    
    if (latestRes.status === 200 && latestRes.data && latestRes.data.has_record) {
      // 检查返回的记录是否是今日的
      const recordDate = latestRes.data.date
      
      if (recordDate === today && latestRes.data.duration) {
        // 只有当记录是今日的时候才使用duration
        const duration = latestRes.data.duration
        
        if (typeof duration === 'number') {
          const formatted = formatHoursToTimeDuration(duration)
          todayTotalDuration.value = formatted
        } else if (typeof duration === 'string') {
          const formatted = parseDurationStringToTimeFormat(duration)
          todayTotalDuration.value = formatted
        }
        return
      }
    }
    
    // 如果都没有数据，保持默认值
    todayTotalDuration.value = '0m'
    
  } catch (error) {
    console.error('❌ 获取今日总时长失败:', error)
    // 出错时回退到原来的localStorage方法作为备用
    calculateTodayTotalDurationFromLocal()
  }
}

// 将小时数格式化为 xxh xxm 格式（向下取整）
const formatHoursToTimeDuration = (hours) => {
  // 更严格的验证：小于0.005小时（约18秒）就认为是0
  if (!hours || hours <= 0 || hours < 0.005) {
    return '0m'
  }
  
  const totalMinutes = Math.floor(hours * 60) // 向下取整分钟数
  const h = Math.floor(totalMinutes / 60)
  const m = Math.floor(totalMinutes % 60) // 确保分钟数也是向下取整
  
  // 如果计算出的分钟数为0，直接返回0m
  if (totalMinutes <= 0) {
    return '0m'
  }
  
  if (h > 0) {
    return `${h}h ${m}m`
  } else {
    return `${m}m`
  }
}

// 解析服务器返回的时长字符串（如："1小时30分钟"）转为 xxh xxm 格式（向下取整）
const parseDurationStringToTimeFormat = (durationStr) => {
  if (!durationStr || durationStr === '0小时0分钟') {
    return '0m'
  }
  
  const hourMatch = durationStr.match(/(\d+)小时/)
  const minuteMatch = durationStr.match(/(\d+)分钟/)
  
  const hours = Math.floor(hourMatch ? parseInt(hourMatch[1]) : 0) // 向下取整小时
  const minutes = Math.floor(minuteMatch ? parseInt(minuteMatch[1]) : 0) // 向下取整分钟
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

// 备用的本地计算方法
const calculateTodayTotalDurationFromLocal = () => {
  let totalSeconds = 0
  
  // 只计算历史记录的时长（已完成的学习记录）
  checkinHistory.value.forEach(record => {
    if (record.checkedOut && record.studyDuration) {
      const seconds = parseDurationToSeconds(record.studyDuration)
      if (seconds > 0) {
        totalSeconds += seconds
      }
    }
  })
  
  todayTotalDuration.value = formatSecondsToTimeDuration(totalSeconds)
}

// 加载今日签到历史记录（作为备用数据）
const loadTodayCheckinHistory = async () => {
  try {
    // 注意：现在主要依赖服务器API数据，这里只是作为备用
    
    // 临时使用模拟数据
    const today = new Date().toDateString()
    const savedHistory = localStorage.getItem(`checkin_history_${today}`)
    checkinHistory.value = savedHistory ? JSON.parse(savedHistory) : []
    
    // 不再自动计算总时长，因为现在使用API方法
  } catch (error) {
    console.error('❌ 加载今日签到历史记录失败:', error)
    checkinHistory.value = []
  }
}

// 加载当前签到状态
const loadCurrentCheckinStatus = async () => {
  try {
    // 这里应该调用实际的API获取当前签到状态
    // const response = await fetch('/api/current_checkin_status')
    // const data = await response.json()
    
    // 临时使用 localStorage 模拟持久化状态
    const savedStatus = localStorage.getItem('current_checkin_status')
    if (savedStatus) {
      const status = JSON.parse(savedStatus)
      checkinInfo.value = status
      
      // 如果正在学习中，恢复计时器
      if (status.checkedIn && !status.checkedOut && status.checkinTimestamp) {
        studyStartTime.value = new Date(status.checkinTimestamp).toISOString()
        studyTimer = setInterval(() => {
          updateStudyDuration()
          // 恢复时不需要更新总时长，因为正在学习时显示单次计时
        }, 1000)
        updateStudyDuration()
      }
    }
  } catch (error) {
    console.error('❌ 加载当前签到状态失败:', error)
  }
}

// 保存当前签到状态
const saveCurrentCheckinStatus = () => {
  localStorage.setItem('current_checkin_status', JSON.stringify(checkinInfo.value))
}

// 保存签到记录到历史（作为备用数据）
const saveCheckinToHistory = (checkinData) => {
  const today = new Date().toDateString()
  const record = {
    ...checkinData,
    date: today,
    timestamp: Date.now()
  }
  
  checkinHistory.value.push(record)
  
  // 保存到localStorage（作为备用）
  localStorage.setItem(`checkin_history_${today}`, JSON.stringify(checkinHistory.value))
  
  // 不再自动调用本地计算方法，因为现在使用API方法
}

// 显示签到弹窗
const showCheckinDialog = () => {
  let currentIndex = 0
  let codeValues = ['', '', '', '', '', '']
  
  // 重置状态的函数
  const resetInputState = () => {
    currentIndex = 0
    codeValues = ['', '', '', '', '', '']
    const allInputs = document.querySelectorAll('.verification-digit-input')
    allInputs.forEach((input, index) => {
      input.value = ''
      input.style.borderColor = index === 0 ? '#3b82f6' : '#e5e7eb'
      input.style.background = index === 0 ? '#ffffff' : '#f9fafb'
    })
    if (allInputs[0]) {
      allInputs[0].focus()
    }
  }
  
  // 将重置函数暴露到全局，供handleSubmitCheckin调用
  window.__resetCheckinInput = resetInputState
  
  const inputContainer = h('div', {
    class: 'verification-code-container',
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
      padding: '32px 0'
    }
  }, Array.from({ length: 6 }, (_, index) =>
    h('input', {
      key: index,
      type: 'text',
      maxlength: 1,
      class: 'verification-digit-input',
      'data-index': index,
      style: {
        width: '48px',
        height: '48px',
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        background: index === 0 ? '#ffffff' : '#f9fafb',
        border: index === 0 ? '2px solid #3b82f6' : '2px solid #e5e7eb',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        outline: 'none'
      },
      onInput: (event) => {
        const value = event.target.value
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        
        // 只允许数字
        if (value && !/^\d$/.test(value)) {
          event.target.value = ''
          return
        }
        
        // 更新值
        codeValues[inputIndex] = value
        
        if (value) {
          // 输入了数字，移动到下一个
          if (inputIndex < 5) {
            const nextInput = document.querySelector(`.verification-digit-input[data-index="${inputIndex + 1}"]`)
            if (nextInput) {
              // 更新样式
              event.target.style.borderColor = '#e5e7eb'
              event.target.style.background = '#f9fafb'
              nextInput.style.borderColor = '#3b82f6'
              nextInput.style.background = '#ffffff'
              nextInput.focus()
              currentIndex = inputIndex + 1
            }
          }
          
          // 检查是否完成
          if (codeValues.every(v => v !== '')) {
            const code = codeValues.join('')
            setTimeout(() => {
              handleSubmitCheckin(code)
            }, 100)
          }
        }
      },
      onKeydown: (event) => {
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        
        if (event.key === 'Backspace') {
          if (!event.target.value && inputIndex > 0) {
            // 当前框为空且按退格，回到上一个
            const prevInput = document.querySelector(`.verification-digit-input[data-index="${inputIndex - 1}"]`)
            if (prevInput) {
              prevInput.value = ''
              codeValues[inputIndex - 1] = ''
              // 更新样式
              event.target.style.borderColor = '#e5e7eb'
              event.target.style.background = '#f9fafb'
              prevInput.style.borderColor = '#3b82f6'
              prevInput.style.background = '#ffffff'
              prevInput.focus()
              currentIndex = inputIndex - 1
            }
          } else if (event.target.value) {
            // 清除当前值
            codeValues[inputIndex] = ''
          }
        } else if (event.key === 'Enter') {
          if (codeValues.every(v => v !== '')) {
            const code = codeValues.join('')
            handleSubmitCheckin(code)
          }
        }
      },
      onFocus: (event) => {
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        // 只允许聚焦到第一个空位或当前位置
        const emptyIndex = codeValues.findIndex(v => v === '')
        if (emptyIndex !== -1 && inputIndex !== emptyIndex && inputIndex > emptyIndex) {
          const correctInput = document.querySelector(`.verification-digit-input[data-index="${emptyIndex}"]`)
          if (correctInput) {
            correctInput.focus()
            return
          }
        }
        currentIndex = inputIndex
      },
      onClick: (event) => {
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        // 点击时聚焦到第一个空位
        const emptyIndex = codeValues.findIndex(v => v === '')
        if (emptyIndex !== -1 && inputIndex !== emptyIndex) {
          const correctInput = document.querySelector(`.verification-digit-input[data-index="${emptyIndex}"]`)
          if (correctInput) {
            correctInput.focus()
          }
        }
      }
    })
  ))

  // 保存 MessageBox 实例引用 - 注意：ElMessageBox 返回的是 Promise，不是对象
  ElMessageBox({
    title: '开始学习',
    message: inputContainer,
    showCancelButton: false,
    showConfirmButton: false,
    showClose: false,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    customClass: 'simple-checkin-box'
  }).then(() => {
    // 清理全局函数
    delete window.__resetCheckinInput
  }).catch(() => {
    delete window.__resetCheckinInput
  })

  // 初始化聚焦
  nextTick(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('.verification-digit-input[data-index="0"]')
      if (firstInput) {
        firstInput.focus()
        currentIndex = 0
      }
    }, 100)
  })
}

// 显示签退弹窗
const showCheckoutDialog = () => {
  let currentIndex = 0
  let codeValues = ['', '', '', '', '', '']
  
  // 重置状态的函数
  const resetInputState = () => {
    currentIndex = 0
    codeValues = ['', '', '', '', '', '']
    const allInputs = document.querySelectorAll('.verification-digit-input')
    allInputs.forEach((input, index) => {
      input.value = ''
      input.style.borderColor = index === 0 ? '#3b82f6' : '#e5e7eb'
      input.style.background = index === 0 ? '#ffffff' : '#f9fafb'
    })
    if (allInputs[0]) {
      allInputs[0].focus()
    }
  }
  
  // 将重置函数暴露到全局，供handleSubmitCheckout调用
  window.__resetCheckoutInput = resetInputState
  
  const inputContainer = h('div', {
    class: 'verification-code-container',
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
      padding: '32px 0'
    }
  }, Array.from({ length: 6 }, (_, index) =>
    h('input', {
      key: index,
      type: 'text',
      maxlength: 1,
      class: 'verification-digit-input',
      'data-index': index,
      style: {
        width: '48px',
        height: '48px',
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        background: index === 0 ? '#ffffff' : '#f9fafb',
        border: index === 0 ? '2px solid #3b82f6' : '2px solid #e5e7eb',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        outline: 'none'
      },
      onInput: (event) => {
        const value = event.target.value
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        
        // 只允许数字
        if (value && !/^\d$/.test(value)) {
          event.target.value = ''
          return
        }
        
        // 更新值
        codeValues[inputIndex] = value
        
        if (value) {
          // 输入了数字，移动到下一个
          if (inputIndex < 5) {
            const nextInput = document.querySelector(`.verification-digit-input[data-index="${inputIndex + 1}"]`)
            if (nextInput) {
              // 更新样式
              event.target.style.borderColor = '#e5e7eb'
              event.target.style.background = '#f9fafb'
              nextInput.style.borderColor = '#3b82f6'
              nextInput.style.background = '#ffffff'
              nextInput.focus()
              currentIndex = inputIndex + 1
            }
          }
          
          // 检查是否完成
          if (codeValues.every(v => v !== '')) {
            const code = codeValues.join('')
            setTimeout(() => {
              handleSubmitCheckout(code)
            }, 100)
          }
        }
      },
      onKeydown: (event) => {
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        
        if (event.key === 'Backspace') {
          if (!event.target.value && inputIndex > 0) {
            // 当前框为空且按退格，回到上一个
            const prevInput = document.querySelector(`.verification-digit-input[data-index="${inputIndex - 1}"]`)
            if (prevInput) {
              prevInput.value = ''
              codeValues[inputIndex - 1] = ''
              // 更新样式
              event.target.style.borderColor = '#e5e7eb'
              event.target.style.background = '#f9fafb'
              prevInput.style.borderColor = '#3b82f6'
              prevInput.style.background = '#ffffff'
              prevInput.focus()
              currentIndex = inputIndex - 1
            }
          } else if (event.target.value) {
            // 清除当前值
            codeValues[inputIndex] = ''
          }
        } else if (event.key === 'Enter') {
          if (codeValues.every(v => v !== '')) {
            const code = codeValues.join('')
            handleSubmitCheckout(code)
          }
        }
      },
      onFocus: (event) => {
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        // 只允许聚焦到第一个空位或当前位置
        const emptyIndex = codeValues.findIndex(v => v === '')
        if (emptyIndex !== -1 && inputIndex !== emptyIndex && inputIndex > emptyIndex) {
          const correctInput = document.querySelector(`.verification-digit-input[data-index="${emptyIndex}"]`)
          if (correctInput) {
            correctInput.focus()
            return
          }
        }
        currentIndex = inputIndex
      },
      onClick: (event) => {
        const inputIndex = parseInt(event.target.getAttribute('data-index'))
        // 点击时聚焦到第一个空位
        const emptyIndex = codeValues.findIndex(v => v === '')
        if (emptyIndex !== -1 && inputIndex !== emptyIndex) {
          const correctInput = document.querySelector(`.verification-digit-input[data-index="${emptyIndex}"]`)
          if (correctInput) {
            correctInput.focus()
          }
        }
      }
    })
  ))

  // 保存 MessageBox 实例引用 - 注意：ElMessageBox 返回的是 Promise，不是对象
  ElMessageBox({
    title: '结束学习',
    message: inputContainer,
    showCancelButton: false,
    showConfirmButton: false,
    showClose: false,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    customClass: 'simple-checkout-box'
  }).then(() => {
    // 清理全局函数
    delete window.__resetCheckoutInput
  }).catch(() => {
    delete window.__resetCheckoutInput
  })

  // 初始化聚焦
  nextTick(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('.verification-digit-input[data-index="0"]')
      if (firstInput) {
        firstInput.focus()
        currentIndex = 0
      }
    }, 100)
  })
}

// 处理提交签到
const handleSubmitCheckin = async (code) => {
  loading.value = true
  
  // 在提交签到的瞬间记录客户端时间，这样计时器从00:00:00开始
  const clientStartTime = new Date().toISOString()
  
  try {
    const success = await submitCheckCode(code)
    if (success) {
      // 签到成功后，使用客户端记录的开始时间
      studyStartTime.value = clientStartTime
      
      // 立即显示00:00:00，不调用updateStudyDuration()避免计算时间差
      currentStudyDuration.value = '00:00:00'
      
      // 启动计时器，从下一秒开始更新
      if (!studyTimer) {
        studyTimer = setInterval(() => {
          updateStudyDuration()
          checkOvertimeWarning()
        }, 1000)
      }
      
      // 显示所有输入框的成功动画
      const allInputs = document.querySelectorAll('.verification-digit-input')
      allInputs.forEach(input => {
        input.classList.add('input-success')
      })
      
      // 延迟关闭对话框
      setTimeout(() => {
        // 先移除动画类
        allInputs.forEach(input => {
          input.classList.remove('input-success')
        })
        
        // 使用 ElMessageBox.close() 静态方法关闭所有对话框
        try {
          ElMessageBox.close()
        } catch (error) {
          // 如果静态方法不可用，尝试通过 DOM 操作关闭
          const messageBox = document.querySelector('.el-message-box')
          if (messageBox) {
            const closeBtn = messageBox.querySelector('.el-message-box__close')
            if (closeBtn) {
              closeBtn.click()
            } else {
              // 最后的备用方案：点击遮罩层
              const wrapper = document.querySelector('.el-message-box__wrapper')
              if (wrapper) {
                wrapper.click()
              }
            }
          }
        }
      }, 800)
    }
  } catch (error) {
    console.error('签到失败:', error)
    // 显示所有输入框的错误动画
    const allInputs = document.querySelectorAll('.verification-digit-input')
    allInputs.forEach(input => {
      input.classList.add('input-error')
    })
    
    setTimeout(() => {
      // 移除错误动画
      allInputs.forEach(input => {
        input.classList.remove('input-error')
      })
      
      // 使用全局重置函数
      if (window.__resetCheckinInput) {
        window.__resetCheckinInput()
      }
    }, 400)
  } finally {
    loading.value = false
  }
}

// 处理提交签退
const handleSubmitCheckout = async (code) => {
  loading.value = true
  try {
    const success = await submitCheckOutCode(code)
    if (success) {
      // 显示所有输入框的成功动画
      const allInputs = document.querySelectorAll('.verification-digit-input')
      allInputs.forEach(input => {
        input.classList.add('input-success')
      })
      
      // 延迟关闭对话框
      setTimeout(() => {
        // 先移除动画类
        allInputs.forEach(input => {
          input.classList.remove('input-success')
        })
        
        // 使用 ElMessageBox.close() 静态方法关闭所有对话框
        try {
          ElMessageBox.close()
        } catch (error) {
          // 如果静态方法不可用，尝试通过 DOM 操作关闭
          const messageBox = document.querySelector('.el-message-box')
          if (messageBox) {
            const closeBtn = messageBox.querySelector('.el-message-box__close')
            if (closeBtn) {
              closeBtn.click()
            } else {
              // 最后的备用方案：点击遮罩层
              const wrapper = document.querySelector('.el-message-box__wrapper')
              if (wrapper) {
                wrapper.click()
              }
            }
          }
        }
      }, 800)
    }
  } catch (error) {
    console.error('签退失败:', error)
    // 显示所有输入框的错误动画
    const allInputs = document.querySelectorAll('.verification-digit-input')
    allInputs.forEach(input => {
      input.classList.add('input-error')
    })
    
    setTimeout(() => {
      // 移除错误动画
      allInputs.forEach(input => {
        input.classList.remove('input-error')
      })
      
      // 使用全局重置函数
      if (window.__resetCheckoutInput) {
        window.__resetCheckoutInput()
      }
    }, 400)
  } finally {
    loading.value = false
  }
}

// 方法
function requestCheckin() {
  showCheckinDialog()
}

function requestCheckout() {
  showCheckoutDialog()
}

function handleCheckin() {
  loading.value = true
  
  const now = new Date()
  studyStartTime.value = now.toISOString()
  
  const checkinData = {
    checkedIn: true,
    checkedOut: false,
    checkinTime: now.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    checkinTimestamp: now.getTime(),
    checkoutTime: null,
    location: null,
    studyDuration: null,
    isOvertime: false
  }
  
  // 更新内部状态
  checkinInfo.value = { ...checkinData }
  saveCurrentCheckinStatus()
  
  // 开始计时
  studyTimer = setInterval(() => {
    updateStudyDuration()
    // 实时更新今日总时长 - 移除这行，正在学习时不应该更新总时长
  }, 1000)
  
  emit('checkin', checkinData)
  loading.value = false
}

function handleCheckout() {
  loading.value = true
  
  const checkoutData = {
    ...checkinInfo.value,
    checkedOut: true,
    checkoutTime: new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    studyDuration: currentStudyDuration.value
  }
  
  // 更新内部状态
  checkinInfo.value = { ...checkoutData }
  saveCurrentCheckinStatus()
  
  // 停止计时
  if (studyTimer) {
    clearInterval(studyTimer)
    studyTimer = null
  }
  
  // 保存这次的签到记录到历史
  saveCheckinToHistory(checkoutData)
  
  // 签退后重新计算今日总时长
  calculateTodayTotalDuration()
  
  emit('checkout', checkoutData)
  loading.value = false
}

// 生命周期
onMounted(async () => {
  // 更新当前时间
  nowTime.value = new Date()
  
  // 启动时间更新定时器
  const timeTimer = setInterval(() => {
    nowTime.value = new Date()
  }, 1000)
  
  // 检查是否有token，只有登录状态下才发起API请求
  if (checkLogin()) {
    // 获取最新签到状态
    await getLatesetCheckStatus()
    
    // 加载今日签到历史记录（作为备用）
    await loadTodayCheckinHistory()
    
    // 使用基于API的方法计算今日总时长
    await calculateTodayTotalDuration()
  } else {
    // 未登录状态下设置默认值
    checkinInfo.value.checkedIn = false
    checkinInfo.value.checkedOut = false
    todayTotalDuration.value = '0m'
  }
  
  // 清理时间定时器
  onUnmounted(() => {
    clearInterval(timeTimer)
  })
})

onUnmounted(() => {
  if (studyTimer) {
    clearInterval(studyTimer)
  }
})

// 暴露方法给父组件
defineExpose({
  handleCheckin,
  handleCheckout
})
</script>

<style scoped>
/* =================== 基础容器样式 =================== */
.checkin-status {
  margin-top: 24px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  height: auto;
  min-height: 50px;
  transform-origin: top center;
  transform: scale(1);
}

/* =================== 计时器展示样式 =================== */
.study-timer-expanded {
  margin-bottom: 24px;
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  opacity: 1;
}

.timer-display-expanded {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  width: auto;
  min-width: 200px;
  max-width: 425px;
  margin: 0 auto;
  transform: scale(1);
  opacity: 1;
  padding: 16px 20px;
}

.timer-display-expanded .timer-text {
  display: block;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.timer-value-expanded {
  font-size: clamp(24px, 4.5vw, 48px);
  font-weight: 300;
  color: #2d3748;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Mono', monospace;
  letter-spacing: clamp(1px, 0.2vw, 3px);
  line-height: 1.2;
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-dark .timer-display-expanded {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.theme-dark .timer-display-expanded .timer-text {
  color: rgba(255, 255, 255, 0.8);
}

.theme-dark .timer-value-expanded {
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* =================== 超时警告样式 =================== */
.timer-display-expanded.overtime-warning {
  border: 2px solid #e74c3c !important;
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%) !important;
  box-shadow: 0 8px 32px rgba(231, 76, 60, 0.2) !important;
  animation: overtime-pulse 2s infinite;
}

.theme-dark .timer-display-expanded.overtime-warning {
  background: linear-gradient(135deg, #2d1b1b 0%, #4a1f1f 100%) !important;
  border: 2px solid #e74c3c !important;
  box-shadow: 0 8px 32px rgba(231, 76, 60, 0.3) !important;
}

.timer-text.overtime-text {
  color: #e74c3c !important;
  font-weight: 700 !important;
}

.timer-value-expanded.overtime-value {
  color: #c0392b !important;
  font-weight: 600 !important;
}

.theme-dark .timer-value-expanded.overtime-value {
  color: #e74c3c !important;
}

.overtime-message {
  font-size: 14px;
  color: #e74c3c;
  font-weight: 500;
  margin-top: 8px;
  text-align: center;
  animation: overtime-blink 1.5s ease-in-out infinite alternate;
}

.theme-dark .overtime-message {
  color: #ec7063;
}

@keyframes overtime-pulse {
  0%, 100% {
    box-shadow: 0 8px 32px rgba(231, 76, 60, 0.2);
  }
  50% {
    box-shadow: 0 12px 40px rgba(231, 76, 60, 0.4);
  }
}

@keyframes overtime-blink {
  0% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* =================== 打卡按钮区域样式 =================== */
.checkin-actions {
  display: flex;
  justify-content: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  opacity: 1;
}

.status-display {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  min-width: 200px;
  width: auto;
  display: inline-block;
}

.status-jelly-hover {
  transform: scale(1.05) !important;
  border-radius: 20px !important;
  min-width: 220px !important;
  padding: 14px 20px !important;
  background: linear-gradient(135deg, #56e3a4 0%, #3ae9b4 100%) !important;
  box-shadow: 0 12px 40px rgba(92, 235, 235, 0.4) !important;
  animation: jellyBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes jellyBounce {
  0% { transform: scale(1); }
  25% { transform: scale(0.95) scaleX(1.1); }
  50% { transform: scale(1.02) scaleX(0.98); }
  75% { transform: scale(1.01) scaleX(1.02); }
  100% { transform: scale(1.05); }
}

/* 展开状态专用样式 */
.expanded-status {
  min-width: 200px !important;
  width: auto !important;
  height: 32px !important;
  border-radius: 20px !important;
  padding: 6px 20px !important;
  display: flex !important;
  align-items: center;
  justify-content: center !important;
}

.expanded-status .status-content-wrapper {
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 危险状态（正在学习中）的样式 */
.danger-style {
  background: linear-gradient(135deg, #ef4242 0%, #df3939 100%) !important;
  color: white !important;
}

.danger-style.status-jelly-hover {
  background: linear-gradient(135deg, #ef4242 0%, #df3939 100%) !important;
  border-color: rgba(197, 48, 48, 0.3) !important;
  box-shadow: 0 12px 40px rgba(229, 62, 62, 0.4) !important;
}

/* 完成状态的样式 */
.completed-style {
  background: rgba(255, 255, 255, 0.4) !important;
  color: #2d3748 !important;
}

.completed-style.status-jelly-hover {
  background: linear-gradient(135deg, #56e3a4 0%, #3ae9b4 100%) !important;
  color: white !important;
}

.status-content-wrapper {
  position: relative;
  width: 100%;
  height: 24px;
  overflow: hidden;
}

.status-content {
  position: relative;
  width: 100%;
  height: 100%;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}

.status-info {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 1;
  transform: translateY(-50%) translateX(0);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-info.info-hidden {
  opacity: 0;
  transform: translateY(-50%) translateX(-20px);
}

.status-button {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-button.button-visible {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* 文本和图标样式 */
.status-text {
  font-size: 18px;
  font-weight: 500;
  color: #2d3748;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.status-icon {
  font-size: 12px;
  color: #4a5568;
  opacity: 0.8;
}

.button-text {
  font-size: 16px;
  font-weight: 600;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.button-icon {
  font-size: 8px;
  color: white;
  opacity: 0.8;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.4; }
}

/* =================== 主题适配 =================== */
.theme-dark .status-jelly-hover {
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 12px 40px rgba(255, 255, 255, 0.3) !important;
}

.theme-dark .status-text {
  color: #ffffff;
}

.theme-dark .status-icon {
  color: rgba(255, 255, 255, 0.8);
}

.theme-dark .status-jelly-hover .button-text {
  color: #000000;
}

.theme-dark .status-display {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* =================== 响应式设计 =================== */
@media (max-width: 768px) {
  .checkin-status {
    margin-top: 20px;
  }
  
  .timer-display-expanded {
    padding: 20px 16px;
    max-width: 350px;
    min-width: 180px;
  }
  
  .timer-value-expanded {
    font-size: clamp(20px, 5vw, 40px);
    letter-spacing: clamp(1px, 0.3vw, 2px);
  }
  
  .timer-display-expanded .timer-text {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .status-display {
    padding: 20px 16px;
    border-radius: 16px;
  }
  
  .status-jelly-hover {
    min-width: 200px !important;
    padding: 12px 16px !important;
  }
  
  .status-text, .button-text {
    font-size: 14px !important;
  }
  
  .status-icon {
    font-size: 11px !important;
  }
  
  .checkin-actions {
    width: 100%;
  }
  
  .expanded-status {
    width: 100% !important;
    min-width: auto !important;
    height: 48px !important;
    font-size: 15px !important;
  }
}

@media (max-width: 480px) {
  .timer-display-expanded {
    padding: 16px 12px;
    max-width: 300px;
    min-width: 160px;
  }
  
  .timer-value-expanded {
    font-size: clamp(18px, 6vw, 36px);
    letter-spacing: clamp(0.5px, 0.2vw, 1px);
  }
  
  .timer-display-expanded .timer-text {
    font-size: 13px;
    margin-bottom: 10px;
  }
  
  .status-display {
    padding: 18px 14px;
    border-radius: 14px;
  }
  
  .status-jelly-hover {
    min-width: 180px !important;
    padding: 10px 14px !important;
  }
  
  .status-text, .button-text {
    font-size: 13px !important;
  }
  
  .status-icon {
    font-size: 10px !important;
  }
  
  .expanded-status {
    height: 48px !important;
    font-size: 14px !important;
  }
}

/* =================== 以下为冗余的折叠状态代码（已停用）=================== */
/*
折叠状态下的计时器样式
.study-timer-collapsed {
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.95);
  opacity: 0.95;
}

.study-timer {
  margin-bottom: 24px;
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.study-status-collapsed {
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.95);
  opacity: 0.95;
}

.timer-display {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  padding: 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.timer-collapsed {
  padding: 12px 16px !important;
  border-radius: 24px !important;
  min-width: 120px;
  width: auto;
  display: inline-block;
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.timer-jelly-hover {
  transform: scale(1.05) !important;
  border-radius: 20px !important;
  min-width: 160px !important;
  padding: 14px 20px !important;
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%) !important;
  border: 1px solid rgba(229, 62, 62, 0.3) !important;
  box-shadow: 0 12px 40px rgba(229, 62, 62, 0.4) !important;
  animation: jellyBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.timer-content-wrapper {
  position: relative;
  width: 100%;
  height: 24px;
  overflow: hidden;
}

.timer-content {
  position: relative;
  width: 100%;
  height: 100%;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-info {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 1;
  transform: translateX(0);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-info.info-hidden {
  opacity: 0;
  transform: translateX(-20px);
}

.timer-button {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: translateX(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-button.button-visible {
  opacity: 1;
  transform: translateX(0);
}

.timer-button-text {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
  opacity: 0;
  animation: fadeInScale 0.4s ease-out 0.2s forwards;
}

/* 简化的签到对话框样式 */
:global(.simple-checkin-box) {
  border-radius: 16px !important;
  overflow: hidden !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  border: none !important;
}

:global(.simple-checkin-box .el-message-box__wrapper) {
  background-color: rgba(0, 0, 0, 0.3) !important;
}

:global(.simple-checkin-box .el-message-box__header) {
  background: #ffffff !important;
  color: #333333 !important;
  padding: 32px 24px 24px 24px !important;
  border-bottom: none !important;
  text-align: center !important;
}

:global(.simple-checkin-box .el-message-box__title) {
  color: #1f2937 !important;
  font-weight: 600 !important;
  font-size: 20px !important;
  margin: 0 !important;
  text-align: center !important;
}

:global(.simple-checkin-box .el-message-box__content) {
  padding: 0 24px 32px 24px !important;
}

:global(.simple-checkout-box) {
  border-radius: 16px !important;
  overflow: hidden !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  border: none !important;
}

:global(.simple-checkout-box .el-message-box__wrapper) {
  background-color: rgba(0, 0, 0, 0.3) !important;
}

:global(.simple-checkout-box .el-message-box__header) {
  background: #ffffff !important;
  color: #333333 !important;
  padding: 32px 24px 24px 24px !important;
  border-bottom: none !important;
  text-align: center !important;
}

:global(.simple-checkout-box .el-message-box__title) {
  color: #1f2937 !important;
  font-weight: 600 !important;
  font-size: 20px !important;
  margin: 0 !important;
  text-align: center !important;
}

:global(.simple-checkout-box .el-message-box__content) {
  padding: 0 24px 32px 24px !important;
}

/* 输入框动画效果 - 只在API成功/失败时播放 */
:global(.input-success) {
  animation: modern-success-pulse 0.6s ease-out !important;
  border-color: #10b981 !important;
  background-color: #f0fdf4 !important;
  color: #065f46 !important;
}

:global(.input-error) {
  animation: modern-error-shake 0.4s ease-out !important;
  border-color: #ef4444 !important;
  background-color: #fef2f2 !important;
  color: #dc2626 !important;
}

@keyframes modern-success-pulse {
  0% { 
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    transform: scale(1.05);
  }
  100% { 
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    transform: scale(1);
  }
}

@keyframes modern-error-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}

.theme-dark .timer-button-text {
  color: #000000;
}
</style>
