<template>
  <div class="user-greeting-container" :class="{ 'theme-dark': isDarkMode, 'collapsed': isCollapsed }">
    <div class="user-greeting" :class="{ 'theme-dark': isDarkMode, 'collapsed': isCollapsed }">
      <!-- 问候语头部 -->
      <div class="greeting-header">
        <h3>{{ greetingMessage }}</h3>
      </div>

      <!-- 当前时间日期 -->
      <div class="datetime-display" v-if="showDateTime">
        <!-- 折叠状态下隐藏时间 -->
        <div class="time" v-if="!isCollapsed">{{ currentTime }}</div>
        <div class="date-info">
          <span class="date">{{ currentDate }}</span>
          <span class="week">{{ currentWeek }}</span>
        </div>
        <div class="weather" v-if="weatherInfo">
          <span>{{ weatherInfo.description }} {{ weatherInfo.temperature }}°</span>
        </div>
        <div class="motivation" v-if="showMotivation && motivationText">
          <span>{{ motivationText }}</span>
        </div>
      </div>
    </div>

    <!-- 打卡状态组件 -->
    <CheckinStatus
      v-if="showCheckinStatus"
      :checkin-info="adaptedCheckinInfo"
      :is-dark-mode="isDarkMode"
      :is-collapsed="isCollapsed"
      @checkin="handleCheckin"
      @checkout="handleCheckout"
      @request-checkin="openCheckin"
      @request-checkout="openCheckout"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import CheckinStatus from './CheckinStatus.vue'
import api from '../../api'

// Props
const props = defineProps({
  // 用户信息
  userInfo: {
    type: Object,
    required: true,
    default: () => ({
      id: '',
      name: '用户',
      avatar: null,
      role: null
    })
  },
  // 是否显示日期时间
  showDateTime: {
    type: Boolean,
    default: true
  },
  // 是否显示学习统计
  showStats: {
    type: Boolean,
    default: true
  },
  // 是否显示激励语句
  showMotivation: {
    type: Boolean,
    default: true
  },
  // 天气信息
  weatherInfo: {
    type: Object,
    default: null
  },
  // 学习统计数据
  studyStats: {
    type: Object,
    default: () => ({
      todayHours: '2.5h',
      weekHours: '15.5h',
      totalDays: '7天'
    })
  },
  // 主题模式
  isDarkMode: {
    type: Boolean,
    default: false
  },
  // 是否折叠状态
  isCollapsed: {
    type: Boolean,
    default: false
  },
  // 是否显示打卡状态
  showCheckinStatus: {
    type: Boolean,
    default: false
  },
  // 打卡信息
  checkinInfo: {
    type: Object,
    default: () => ({
      checkedIn: false,
      checkedOut: false,
      checkinTime: null,
      checkinTimestamp: null,
      checkoutTime: null,
      location: null,
      studyDuration: null
    })
  }
})

// Emits
const emit = defineEmits(['checkin', 'checkout', 'request-checkin', 'request-checkout'])

// 响应式数据
const currentTime = ref('')
const currentDate = ref('')
const currentWeek = ref('')
const nowTime = ref(new Date())

// 打卡相关状态
const todayRecord = ref({}) // 今日打卡记录
const formeCheckStatus = ref([]) // 历史记录，用于计算累计时长
const isVisible = ref(false) // 是否显示签退界面
const checkTime = ref(null) // 签到时间
const hasShownOvertimeWarning = ref(false) // 是否已显示超时警告
const hasShownSevereOvertimeWarning = ref(false) // 是否已显示严重超时警告

// 登录检查
const checkLogin = () => {
  const token = localStorage.getItem('token')
  return !!token
}

// 激励语句库
const motivationTexts = [
  '今天也要加油学习哦！',
  '每一次努力都是为了更好的自己',
  '学而时习之，不亦说乎',
  '知识就是力量，坚持就是胜利',
  '今日学习，明日收获',
  '积少成多，积沙成塔',
  '勤奋是成功的阶梯',
  '学习使人进步，努力成就梦想'
]

// 获取打卡状态（历史记录，用于累计时长计算）
const fetchCheckStatus = async () => {
  if (!checkLogin()) return
  
  try {
    const res = await api({
      url: '/records',
      method: 'get'
    })
    formeCheckStatus.value = [
      ...res.data.previous_month.records,
      ...res.data.current_month.records,
    ]
  } catch (error) {
    console.error('获取历史记录失败:', error)
  }
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
    isVisible.value = false
    return
  }
  
  // 基于服务器数据判断状态
  if (todayRecord.value.has_record && todayRecord.value.check_in_time) {
    if (!todayRecord.value.check_out_time) {
      // 已签到但未签退，状态为"进行中"
      const serverCheckTime = new Date(todayRecord.value.check_in_time)
      checkTime.value = serverCheckTime
    } else {
      // 已签到且已签退，状态为"已完成"
    }
  } else {
    // 没有打卡记录，初始状态
  }
  
  // 根据服务器数据更新界面显示状态
  checkIsVisible()
}

// 基于服务器数据判断是否显示打卡界面
const checkIsVisible = () => {
  if (todayRecord.value && todayRecord.value.has_record && todayRecord.value.check_in_time) {
    if (!todayRecord.value.check_out_time) {
      // 已签到未签退，显示签退界面
      isVisible.value = true
    } else {
      // 已签退完成，隐藏签退界面，允许再次签到
      isVisible.value = false
    }
  } else {
    // 没有打卡记录，隐藏界面
    isVisible.value = false
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
  if (isOvertime() && !hasShownOvertimeWarning.value) {
    hasShownOvertimeWarning.value = true
    
    // 显示超时警告消息
    ElMessageBox({
      type: 'error',
      message: '⚠️ 学习时长已超过6小时，本次签到记录无效，请尽快签退！长时间学习记得适当休息哦～',
      duration: 10000, // 10秒显示时间
      showClose: true,
      lockScroll: false,
    })
    
    // 5分钟后再次提醒（如果仍未签退且未显示过严重警告）
    setTimeout(() => {
      if (isOvertime() && !hasShownSevereOvertimeWarning.value) {
        hasShownSevereOvertimeWarning.value = true
        ElMessageBox({
          type: 'error',
          message: '🚨 学习时长严重超时！请立即签退并注意休息！',
          duration: 15000, // 15秒显示时间
          showClose: true,
          lockScroll: false,
        })
      }
    }, 5 * 60 * 1000) // 5分钟
  }
  
  // 如果已签退，重置所有警告状态
  if (todayRecord.value?.check_out_time) {
    hasShownOvertimeWarning.value = false
    hasShownSevereOvertimeWarning.value = false
  }
}

// 计算本次签到的持续时间
const calculateThisTimeDuration = () => {
  // 首先检查是否有有效的打卡记录
  if (!todayRecord.value || !todayRecord.value.has_record || !todayRecord.value.check_in_time || todayRecord.value.check_out_time) {
    return null // 未签到、已签退或没有记录时返回null
  }

  let checkInTime = new Date(todayRecord.value.check_in_time)
  
  if (isNaN(checkInTime.getTime())) {
    console.warn('无效的签到时间:', todayRecord.value.check_in_time)
    return null
  }
  
  let duration = nowTime.value - checkInTime
  
  // 如果时间差为负数，说明存在时间同步问题，调整签到时间
  if (duration < 0) {
    checkInTime = new Date(nowTime.value.getTime() - 1000) // 调整为1秒前
    duration = nowTime.value - checkInTime
  }

  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((duration % (1000 * 60)) / 1000)

  const result = `${hours}h ${minutes}m ${seconds}s`
  return result
}

// 计算本次签到的实际学习时长（用于签退后显示）
const calculateLastSessionDuration = () => {
  // 必须有完整的签到签退记录
  if (!todayRecord.value || !todayRecord.value.has_record || 
      !todayRecord.value.check_in_time || !todayRecord.value.check_out_time) {
    return null
  }

  const checkInTime = new Date(todayRecord.value.check_in_time)
  const checkOutTime = new Date(todayRecord.value.check_out_time)
  
  if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
    console.warn('无效的签到或签退时间:', {
      checkInTime: todayRecord.value.check_in_time,
      checkOutTime: todayRecord.value.check_out_time
    })
    return null
  }
  
  const sessionDuration = checkOutTime - checkInTime
  
  if (sessionDuration < 10000) { // 小于10秒
    return null
  }
  
  const hours = Math.floor(sessionDuration / (1000 * 60 * 60))
  const minutes = Math.floor((sessionDuration % (1000 * 60 * 60)) / (1000 * 60))

  const result = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  return result
}

// 解析时长字符串为毫秒
function parseDurationToMilliseconds(duration) {
  const hourMatch = duration.match(/(\d+)小时/)
  const minuteMatch = duration.match(/(\d+)分钟/)

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0

  return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000)
}

// 计算今日总签到时长
const calculateThisDayDuration = () => {
  // 首先检查是否有打卡记录，按照DailyAttendence的逻辑
  if (!todayRecord.value || !todayRecord.value.has_record) {
    return null
  }
  
  // 额外安全检查：如果没有check_in_time也返回null
  if (!todayRecord.value.check_in_time) {
    return null
  }
  
  let totalDurationMilliseconds = 0
  
  // 如果已经签退，直接从历史记录获取最新的累计时间
  if (todayRecord.value.check_out_time) {
    const today = new Date()
    const todayDateString = today.toISOString().split('T')[0]
    const historyRecord = formeCheckStatus.value.find(record => record.date === todayDateString)
    
    if (historyRecord && historyRecord.total_duration) {
      totalDurationMilliseconds = parseDurationToMilliseconds(historyRecord.total_duration)
    }
  } else {
    // 如果还在签到中，使用 todayRecord 的 duration + 当前会话时间
    if (todayRecord.value.duration) {
      if (typeof todayRecord.value.duration === 'number') {
        // 如果是数字，假设是小时数，转换为毫秒
        totalDurationMilliseconds = todayRecord.value.duration * 60 * 60 * 1000
      } else if (typeof todayRecord.value.duration === 'string') {
        // 如果是字符串，使用原有的解析函数
        totalDurationMilliseconds = parseDurationToMilliseconds(todayRecord.value.duration)
      }
    } else {
      // 如果最新接口没有 duration，尝试从历史记录获取
      const today = new Date()
      const todayDateString = today.toISOString().split('T')[0]
      const historyRecord = formeCheckStatus.value.find(record => record.date === todayDateString)
      
      if (historyRecord && historyRecord.total_duration) {
        totalDurationMilliseconds = parseDurationToMilliseconds(historyRecord.total_duration)
      }
    }
    
    // 如果当前正在签到中，加上本次签到的时长
    if (todayRecord.value.check_in_time && !todayRecord.value.check_out_time) {
      const checkInTime = new Date(todayRecord.value.check_in_time)
      
      if (!isNaN(checkInTime.getTime())) {
        const currentSessionDuration = nowTime.value - checkInTime
        
        if (currentSessionDuration > 0) {
          totalDurationMilliseconds += currentSessionDuration
        } else {
          console.warn('当前签到时长为负数，跳过累加:', {
            checkInTime: checkInTime.toISOString(),
            nowTime: nowTime.value.toISOString(),
            duration: currentSessionDuration
          })
        }
      } else {
        console.warn('无效的签到时间，跳过累加:', todayRecord.value.check_in_time)
      }
    }
  }

  // 强制过滤：如果总时长小于10秒，视为未打卡状态（避免时区差异导致的负数或极小值）
  const MINIMUM_DURATION_MS = 10 * 1000 // 10秒的毫秒数
  
  if (totalDurationMilliseconds < MINIMUM_DURATION_MS) {
    return null
  }

  const hours = Math.floor(totalDurationMilliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((totalDurationMilliseconds % (1000 * 60 * 60)) / (1000 * 60))

  const result = `${hours}h ${minutes}m`
  return result
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

      // 重新获取最新状态
      todayRecord.value = await fetchLatestCheckTime()

      if (todayRecord.value && todayRecord.value.check_in_time) {
        const serverCheckTime = new Date(todayRecord.value.check_in_time)
        checkTime.value = serverCheckTime
      } else {
        checkTime.value = new Date()
      }

      isVisible.value = true
      // 签到成功，重置超时警告状态
      hasShownOvertimeWarning.value = false
      hasShownSevereOvertimeWarning.value = false
      return true // 明确返回成功状态
    }
  } catch (error) {
    // 显示错误消息
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
    // 重新抛出错误，让调用方能够捕获
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
      // 重新获取最新状态和历史记录，确保当日累计时间正确显示
      await Promise.all([
        fetchLatestCheckTime().then(data => todayRecord.value = data),
        fetchCheckStatus() // 同时更新历史记录
      ])
      isVisible.value = false
      // 签退成功，重置超时警告状态
      hasShownOvertimeWarning.value = false
      hasShownSevereOvertimeWarning.value = false
      return true // 明确返回成功状态
    }
  } catch (error) {
    // 显示错误消息
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
    // 重新抛出错误，让调用方能够捕获
    throw error
  }
}

// 显示签到弹窗
const openCheckin = () => {
  const codeValue = ref(['', '', '', '', '', ''])
  let closeDialog = null // 用于存储关闭函数
  
  const inputContainer = h('div', { 
    class: 'verification-code-container',
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      padding: '24px 0'
    }
  }, codeValue.value.map((value, index) => 
    h('input', {
      key: index,
      type: 'text',
      maxlength: 1,
      value: value,
      class: 'verification-digit-input',
      style: {
        width: '40px',
        height: '50px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: '600',
        color: '#2c3e50',
        background: '#f8f9fa',
        border: '2px solid #e9ecef',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.3s ease',
        letterSpacing: '0px'
      },
      onInput: async (e) => {
        const inputValue = e.target.value.replace(/[^0-9]/g, '')
        e.target.value = inputValue
        codeValue.value[index] = inputValue
        
        // 添加填充状态样式
        if (inputValue) {
          e.target.classList.add('input-filled')
          e.target.classList.remove('input-error')
        } else {
          e.target.classList.remove('input-filled', 'input-error')
        }
        
        // 自动跳转到下一个输入框
        if (inputValue && index < 5) {
          const nextInput = e.target.parentElement.children[index + 1]
          if (nextInput) {
            nextInput.focus()
          }
        }
        
        // 检查是否输入完成6位数字
        const fullCode = codeValue.value.join('')
        if (fullCode.length === 6 && fullCode.replace(/\s/g, '') === fullCode) {
          // 输入完成，直接调用API验证
          const container = e.target.parentElement
          
          try {
            await submitCheckCode(fullCode)
            // API成功，显示成功动画
            container.classList.add('all-filled')
            Array.from(container.children).forEach((input, i) => {
              setTimeout(() => {
                input.classList.add('input-success')
                input.classList.remove('input-filled')
              }, i * 100)
            })
            
            // 成功后关闭弹窗
            setTimeout(() => {
              if (closeDialog) {
                console.log('使用关闭函数关闭签到弹窗')
                closeDialog()
              } else {
                console.log('关闭函数不存在')
              }
            }, 600)
            
          } catch (error) {
            // API失败，显示错误动画
            Array.from(container.children).forEach((input, i) => {
              setTimeout(() => {
                input.classList.add('input-error')
                setTimeout(() => {
                  input.classList.remove('input-error')
                  input.value = ''
                  codeValue.value[i] = ''
                  input.classList.remove('input-filled')
                }, 500)
              }, i * 50)
            })
            
            // 重新聚焦第一个输入框
            setTimeout(() => {
              container.children[0]?.focus()
            }, 800)
          }
        }
      },
      onKeydown: (e) => {
        // 退格键处理
        if (e.key === 'Backspace' && !codeValue.value[index] && index > 0) {
          const prevInput = e.target.parentElement.children[index - 1]
          if (prevInput) {
            prevInput.focus()
            codeValue.value[index - 1] = ''
            prevInput.value = ''
            prevInput.classList.remove('input-filled', 'input-error', 'input-success')
          }
        }
      },
      onFocus: (e) => {
        e.target.style.borderColor = '#3498db'
        e.target.style.background = '#ffffff'
        e.target.style.transform = 'scale(1.05)'
        e.target.style.boxShadow = '0 0 0 4px rgba(52, 152, 219, 0.2)'
      },
      onBlur: (e) => {
        if (!codeValue.value[index]) {
          e.target.style.borderColor = '#e9ecef'
          e.target.style.background = '#f8f9fa'
        }
        e.target.style.transform = 'scale(1)'
        e.target.style.boxShadow = 'none'
      }
    })
  ))

  const messageBox = ElMessageBox({
    title: '签到',
    message: inputContainer,
    showCancelButton: false,
    showConfirmButton: false,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    lockScroll: false,
    customClass: 'glass-messagebox verification-modal',
  })

  // 设置关闭函数 - 直接查找DOM元素关闭
  closeDialog = () => {
    // 尝试通过DOM操作关闭弹窗
    const messageBoxElement = document.querySelector('.glass-messagebox')
    if (messageBoxElement) {
      const closeBtn = messageBoxElement.querySelector('.el-message-box__headerbtn')
      if (closeBtn) {
        closeBtn.click()
      } else {
        // 如果没有关闭按钮，直接移除元素
        messageBoxElement.remove()
      }
    }
  }

  // 弹窗打开后立即聚焦第一个输入框
  nextTick(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('.glass-messagebox .verification-digit-input')
      if (firstInput) {
        firstInput.focus()
        console.log('已聚焦到第一个输入框')
      }
    }, 200)
  })

  messageBox.catch(() => {
    // 用户手动关闭弹窗，不需要任何动画
    console.log('用户关闭了签到弹窗')
  })
}

// 显示签退弹窗
const openCheckout = () => {
  const codeValue = ref(['', '', '', '', '', ''])
  let closeDialog = null // 用于存储关闭函数
  
  const inputContainer = h('div', { 
    class: 'verification-code-container',
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      padding: '24px 0'
    }
  }, codeValue.value.map((value, index) => 
    h('input', {
      key: index,
      type: 'text',
      maxlength: 1,
      value: value,
      class: 'verification-digit-input',
      style: {
        width: '40px',
        height: '50px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: '600',
        color: '#2c3e50',
        background: '#f8f9fa',
        border: '2px solid #e9ecef',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.3s ease',
        letterSpacing: '0px'
      },
      onInput: async (e) => {
        const inputValue = e.target.value.replace(/[^0-9]/g, '')
        e.target.value = inputValue
        codeValue.value[index] = inputValue
        
        // 添加填充状态样式
        if (inputValue) {
          e.target.classList.add('input-filled')
          e.target.classList.remove('input-error')
        } else {
          e.target.classList.remove('input-filled', 'input-error')
        }
        
        // 自动跳转到下一个输入框
        if (inputValue && index < 5) {
          const nextInput = e.target.parentElement.children[index + 1]
          if (nextInput) {
            nextInput.focus()
          }
        }
        
        // 检查是否输入完成6位数字
        const fullCode = codeValue.value.join('')
        if (fullCode.length === 6 && fullCode.replace(/\s/g, '') === fullCode) {
          // 输入完成，直接调用API验证
          const container = e.target.parentElement
          
          try {
            await submitCheckOutCode(fullCode)
            // API成功，显示成功动画
            container.classList.add('all-filled')
            Array.from(container.children).forEach((input, i) => {
              setTimeout(() => {
                input.classList.add('input-success')
                input.classList.remove('input-filled')
              }, i * 100)
            })
            
            // 成功后关闭弹窗
            setTimeout(() => {
              if (closeDialog) {
                console.log('使用关闭函数关闭签退弹窗')
                closeDialog()
              } else {
                console.log('关闭函数不存在')
              }
            }, 600)
            
          } catch (error) {
            // API失败，显示错误动画
            Array.from(container.children).forEach((input, i) => {
              setTimeout(() => {
                input.classList.add('input-error')
                setTimeout(() => {
                  input.classList.remove('input-error')
                  input.value = ''
                  codeValue.value[i] = ''
                  input.classList.remove('input-filled')
                }, 500)
              }, i * 50)
            })
            
            // 重新聚焦第一个输入框
            setTimeout(() => {
              container.children[0]?.focus()
            }, 800)
          }
        }
      },
      onKeydown: (e) => {
        // 退格键处理
        if (e.key === 'Backspace' && !codeValue.value[index] && index > 0) {
          const prevInput = e.target.parentElement.children[index - 1]
          if (prevInput) {
            prevInput.focus()
            codeValue.value[index - 1] = ''
            prevInput.value = ''
            prevInput.classList.remove('input-filled', 'input-error', 'input-success')
          }
        }
      },
      onFocus: (e) => {
        e.target.style.borderColor = '#3498db'
        e.target.style.background = '#ffffff'
        e.target.style.transform = 'scale(1.05)'
        e.target.style.boxShadow = '0 0 0 4px rgba(52, 152, 219, 0.2)'
      },
      onBlur: (e) => {
        if (!codeValue.value[index]) {
          e.target.style.borderColor = '#e9ecef'
          e.target.style.background = '#f8f9fa'
        }
        e.target.style.transform = 'scale(1)'
        e.target.style.boxShadow = 'none'
      }
    })
  ))

  const messageBox = ElMessageBox({
    title: '签退',
    message: inputContainer,
    showCancelButton: false,
    showConfirmButton: false,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    lockScroll: false,
    customClass: 'glass-messagebox verification-modal',
  })

  // 设置关闭函数 - 直接查找DOM元素关闭
  closeDialog = () => {
    // 尝试通过DOM操作关闭弹窗
    const messageBoxElement = document.querySelector('.glass-messagebox')
    if (messageBoxElement) {
      const closeBtn = messageBoxElement.querySelector('.el-message-box__headerbtn')
      if (closeBtn) {
        closeBtn.click()
      } else {
        // 如果没有关闭按钮，直接移除元素
        messageBoxElement.remove()
      }
    }
  }

  // 弹窗打开后立即聚焦第一个输入框
  nextTick(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('.glass-messagebox .verification-digit-input')
      if (firstInput) {
        firstInput.focus()
        console.log('已聚焦到第一个输入框')
      }
    }, 200)
  })

  messageBox.catch(() => {
    // 用户手动关闭弹窗，不需要任何动画
    console.log('用户关闭了签退弹窗')
  })

  // 将关闭方法暴露给输入框使用
  window.closeCurrentMessageBox = () => {
    messageBoxPromise.close && messageBoxPromise.close()
  }
}

// 计算属性
const greetingMessage = computed(() => {
  const hour = new Date().getHours()
  
  if (hour < 6) return '深夜了，注意休息'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了，早点休息'
})

const motivationText = computed(() => {
  // 根据时间或随机选择激励语句
  const index = new Date().getDate() % motivationTexts.length
  return motivationTexts[index]
})

// 是否已签到的计算属性
const isTodayCheckedComputed = computed(() => {
  if (todayRecord.value && todayRecord.value.has_record && todayRecord.value.check_in_time) {
    return true // 已签到
  }
  return false
})

// 当天累计时长（仅在学习结束后显示）
const todayTotalHours = computed(() => {
  // 只有在已签退且有打卡记录的情况下才显示当天累计时长
  if (todayRecord.value && todayRecord.value.has_record && todayRecord.value.check_out_time) {
    return calculateThisDayDuration()
  }
  return null
})

// 本次学习时长（正在学习中显示）
const currentSessionDuration = computed(() => {
  // 只有在已签到但未签退且有打卡记录的情况下才显示本次时长
  if (todayRecord.value && todayRecord.value.has_record && todayRecord.value.check_in_time && !todayRecord.value.check_out_time) {
    return calculateThisTimeDuration()
  }
  return null
})

// 学习状态文本
const studyStatusText = computed(() => {
  if (!checkLogin()) {
    return '请先登录'
  }
  
  if (todayRecord.value && todayRecord.value.has_record && todayRecord.value.check_in_time) {
    if (!todayRecord.value.check_out_time) {
      // 正在学习中
      if (isOvertime()) {
        return '学习超时，请尽快签退'
      }
      return '正在学习中...'
    } else {
      // 已签退，显示累计时长，可以再次签到
      return '今日已累计时长'
    }
  } else {
    // 未开始学习
    return '今日尚未开始学习'
  }
})

// 生成适配 CheckinStatus 组件的打卡信息
const adaptedCheckinInfo = computed(() => {
  if (!todayRecord.value) {
    return {
      checkedIn: false,
      checkedOut: false,
      checkinTime: null,
      checkinTimestamp: null,
      checkoutTime: null,
      location: null,
      studyDuration: null,
      totalDuration: null
    }
  }

  // 如果正在学习中（已签到未签退）
  const isCurrentlyStudying = !!(todayRecord.value.has_record && todayRecord.value.check_in_time && !todayRecord.value.check_out_time)
  
  // 如果今天有过打卡记录但已经签退
  const hasStudiedToday = !!(todayRecord.value.has_record && todayRecord.value.check_out_time)
  
  const result = {
    checkedIn: isCurrentlyStudying, // 正在学习时为true
    checkedOut: hasStudiedToday && !isCurrentlyStudying, // 已签退且不在学习中时为true
    checkinTime: isCurrentlyStudying ? todayRecord.value.check_in_time : null,
    checkinTimestamp: isCurrentlyStudying ? new Date(todayRecord.value.check_in_time).getTime() : null,
    checkoutTime: todayRecord.value.check_out_time,
    location: null,
    isOvertime: isCurrentlyStudying ? isOvertime() : false, // 传递超时状态
    // 传递时长信息给CheckinStatus，确保遵循最小时长阈值
    studyDuration: isCurrentlyStudying 
      ? calculateThisTimeDuration()  // 正在学习中显示本次时长（已有阈值验证）
      : hasStudiedToday
        ? calculateLastSessionDuration() // 已签退显示本次学习时长，不是累计时长
        : null,
    // 修复：只有在有has_record时才调用calculateThisDayDuration，并遵循最小时长阈值
    totalDuration: (todayRecord.value.has_record && (isCurrentlyStudying || hasStudiedToday)) 
      ? calculateThisDayDuration()  // 已有阈值验证，会返回null如果时长过短
      : null
  }
  return result
})// 处理 CheckinStatus 组件的事件
const handleCheckin = (data) => {
  emit('checkin', data)
}

const handleCheckout = (data) => {
  emit('checkout', data)
}

// 方法
function updateDateTime() {
  const now = new Date()
  
  // 更新时间
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  // 更新日期
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // 更新星期
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentWeek.value = weekdays[now.getDay()]
}

// 定时器
let timeTimer = null

// 生命周期
onMounted(async () => {
  if (props.showDateTime) {
    updateDateTime()
    timeTimer = setInterval(updateDateTime, 1000)
  }
  
  // 实时更新当前时间
  setInterval(() => {
    nowTime.value = new Date()
    // 每次更新时间时检查是否超时
    checkOvertimeWarning()
  }, 1000)
  
  // 如果已登录，获取打卡状态和历史记录
  if (checkLogin()) {
    // 并行获取最新状态和历史记录
    const fetchPromises = [
      getLatesetCheckStatus(),
      fetchCheckStatus()
    ]
    
    try {
      await Promise.all(fetchPromises)
      // 初始化完成后检查一次超时状态
      checkOvertimeWarning()
    } catch (error) {
      console.error('打卡数据获取失败:', error)
    }
    
    // 每30秒同步一次打卡状态，实现多端同步
    setInterval(async () => {
      const currentTodayRecord = { ...todayRecord.value }
      
      // 重新获取最新状态
      todayRecord.value = await fetchLatestCheckTime()
      
      if (currentTodayRecord && todayRecord.value) {
        // 检查状态变化（比如其他端签退了）
        if (!currentTodayRecord.check_out_time && todayRecord.value.check_out_time) {
          isVisible.value = false
          ElMessage({
            message: '检测到其他设备已签退，状态已同步',
            type: 'info',
            duration: 3000
          })
        }
        // 检查是否其他端签到了
        else if (!currentTodayRecord.check_in_time && todayRecord.value.check_in_time) {
          const serverCheckTime = new Date(todayRecord.value.check_in_time)
          checkTime.value = serverCheckTime
          isVisible.value = true
          ElMessage({
            message: '检测到其他设备已签到，状态已同步',
            type: 'info',
            duration: 3000
          })
        }
      }
      
      // 更新界面显示
      checkIsVisible()
      // 检查是否需要超时提示
      checkOvertimeWarning()
    }, 30000) // 30秒同步一次
  }
})

onUnmounted(() => {
  if (timeTimer) {
    clearInterval(timeTimer)
  }
})
</script>

<style scoped>
.user-greeting-container {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 32px;
  max-height: 575px; /* 恢复固定高度 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 恢复居中对齐 */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: expand 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  gap: 24px;
  transform: translateY(0) scale(1);
}

@keyframes expand {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.9) rotateX(15deg);
    box-shadow: 0 4px 16px rgba(135, 206, 250, 0.05);
  }
  50% {
    opacity: 0.8;
    transform: translateY(-5px) scale(1.02) rotateX(0deg);
    box-shadow: 0 12px 40px rgba(135, 206, 250, 0.25);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
    box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  }
}

/* 深色主题下的展开动画 */
.user-greeting-container.theme-dark {
  animation: expandDark 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.user-greeting-container.theme-dark.collapsed {
  animation: collapseDark 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes expandDark {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.9) rotateX(15deg);
    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.02);
  }
  50% {
    opacity: 0.8;
    transform: translateY(-5px) scale(1.02) rotateX(0deg);
    box-shadow: 0 12px 40px rgba(255, 255, 255, 0.08);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
    box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
  }
}

.user-greeting-container.theme-light {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #1a365d;
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
}

.user-greeting-container.theme-dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

/* 折叠状态的容器样式 */
.user-greeting-container.collapsed {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  padding: 20px;
  height: auto;
  min-height: 200px;
  gap: 16px;
  animation: collapse 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: translateY(0) scale(1);
  box-shadow: 0 6px 24px rgba(135, 206, 250, 0.12);
}

@keyframes collapse {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(1.1) rotateX(-10deg);
    box-shadow: 0 4px 16px rgba(135, 206, 250, 0.08);
  }
  60% {
    opacity: 0.9;
    transform: translateY(-3px) scale(0.98) rotateX(0deg);
    box-shadow: 0 8px 28px rgba(135, 206, 250, 0.18);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
    box-shadow: 0 6px 24px rgba(135, 206, 250, 0.12);
  }
}

/* 深色主题下的折叠动画 */
.user-greeting-container.theme-dark {
  &.collapsed {
    animation: collapseDark 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

@keyframes collapseDark {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(1.1) rotateX(-10deg);
    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.02);
  }
  60% {
    opacity: 0.9;
    transform: translateY(-3px) scale(0.98) rotateX(0deg);
    box-shadow: 0 8px 28px rgba(255, 255, 255, 0.06);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
    box-shadow: 0 6px 24px rgba(255, 255, 255, 0.04);
  }
}

.user-greeting-container.collapsed.theme-light {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #1a365d;
  box-shadow: 0 8px 32px rgba(135, 206, 235, 0.2);
}

.user-greeting-container.collapsed.theme-dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.04);
}

.user-greeting {
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}

/* 折叠状态样式 */
.user-greeting.collapsed {
  gap: 16px;
  transform: scale(0.95);
}

.user-greeting.collapsed .greeting-header h3 {
  font-size: 24px;
  margin-bottom: 8px;
  transform: translateY(-5px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-greeting.collapsed .datetime-display {
  padding: 20px 24px;
  transform: scale(0.98);
  opacity: 0.95;
}

.user-greeting.collapsed .total-time-display {
  padding: 8px 16px;
}

.user-greeting.collapsed .total-time-label {
  font-size: 12px;
  margin-bottom: 2px;
}

.user-greeting.collapsed .total-time-value {
  font-size: 16px;
}

.user-greeting.collapsed .date-info {
  margin-bottom: 12px;
  transform: translateY(-2px);
}

.user-greeting.collapsed .motivation {
  padding: 12px 20px;
  font-size: 13px;
  transform: scale(0.96);
  opacity: 0.9;
}

.greeting-header h3 {
  width: 100%;
  margin: 0;
  font-size: 32px;
  font-weight: 300;
  color: #2d3748;
  text-align: center;
  letter-spacing: -0.8px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.theme-dark .greeting-header h3 {
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.datetime-display {
  width: auto; /* 改为自适应宽度 */
  min-width: 450px; /* 设置最小宽度保持美观 */
  max-width: 600px; /* 设置最大宽度防止过宽 */
  text-align: center;
  padding: 32px 24px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transform: scale(1);
  opacity: 1;
  overflow: hidden; /* 防止内容溢出 */
  word-wrap: break-word; /* 长单词换行 */
  display: flex; /* 使用flexbox布局 */
  flex-direction: column; /* 垂直排列 */
  align-items: center; /* 居中对齐 */
  box-sizing: border-box; /* 包含padding和border在内的盒模型 */
}

.theme-dark .datetime-display {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

.time {
  font-size: clamp(36px, 8vw, 52px); /* 响应式字体大小 */
  font-weight: 100;
  color: #2d3748;
  margin-bottom: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -2px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  white-space: nowrap; /* 防止时间换行 */
  overflow: hidden; /* 隐藏溢出部分 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  width: 100%; /* 使用全部可用宽度 */
  max-width: 100%; /* 限制最大宽度 */
  flex-shrink: 0; /* 防止被压缩 */
}

.theme-dark .time {
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.date-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
  flex-wrap: wrap; /* 允许换行 */
  width: 100%; /* 使用全部可用宽度 */
  max-width: 100%; /* 限制最大宽度 */
  flex-shrink: 0; /* 防止被压缩 */
}

.date {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  transition: color 0.3s ease;
  white-space: nowrap; /* 防止换行 */
  overflow: hidden; /* 隐藏溢出 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  max-width: 200px; /* 限制最大宽度 */
}

.theme-dark .date {
  color: rgba(255, 255, 255, 0.8);
}

.week {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  transition: color 0.3s ease;
  white-space: nowrap; /* 防止换行 */
  overflow: hidden; /* 隐藏溢出 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  max-width: 100px; /* 限制最大宽度 */
}

.theme-dark .week {
  color: rgba(255, 255, 255, 0.8);
}

.weather {
  font-size: 15px;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.theme-dark .weather {
  color: #ffffff;
}

.motivation {
  padding: 14px 20px;
  /* background: rgba(255, 255, 255, 0.4); */
  border-radius: 16px;
  /* border: 1px solid rgba(255, 255, 255, 0.5); */
  color: #6a7383;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  opacity: 1;
}

.theme-dark .motivation {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.daily-total-time {
  margin-top: 12px;
}

.total-time-display {
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  padding: 12px 20px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  text-align: center;
  transition: all 0.3s ease;
}

.theme-dark .total-time-display {
  background: rgba(129, 140, 248, 0.15);
  border: 1px solid rgba(129, 140, 248, 0.3);
}

.total-time-label {
  display: block;
  font-size: 14px;
  color: #6366f1;
  margin-bottom: 4px;
  font-weight: 500;
}

.theme-dark .total-time-label {
  color: #818cf8;
}

.total-time-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #4f46e5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
}

.theme-dark .total-time-value {
  color: #6366f1;
}

.study-stats {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.theme-dark .study-stats {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
}

.theme-dark .stat-item {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.theme-dark .stat-value {
  color: #ffffff;
}

.stat-label {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.theme-dark .stat-label {
  color: rgba(255, 255, 255, 0.6);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-greeting-container {
    padding: 24px;
    border-radius: 20px;
  }
  
  .user-greeting-container.collapsed {
    padding: 16px;
    border-radius: 16px;
    min-height: 160px;
  }
  
  .greeting-header h3 {
    font-size: 28px;
  }
  
  .user-greeting.collapsed .greeting-header h3 {
    font-size: 20px;
  }
  
  .datetime-display {
    min-width: 320px; /* 移动端调整最小宽度 */
    max-width: 400px; /* 移动端调整最大宽度 */
    padding: 28px 20px;
    border-radius: 20px;
  }
  
  .user-greeting.collapsed .datetime-display {
    padding: 16px 18px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .stat-item {
    padding: 16px 12px;
    border-radius: 12px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .user-greeting-container {
    gap: 20px;
    padding: 20px;
    border-radius: 16px;
  }
  
  .user-greeting-container.collapsed {
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    min-height: 140px;
  }
  
  .user-greeting {
    gap: 20px;
  }
  
  .user-greeting.collapsed {
    gap: 12px;
  }
  
  .greeting-header h3 {
    font-size: 24px;
  }
  
  .user-greeting.collapsed .greeting-header h3 {
    font-size: 18px;
  }
  
  .datetime-display {
    min-width: 280px; /* 小屏幕进一步调整最小宽度 */
    max-width: 350px; /* 小屏幕进一步调整最大宽度 */
    padding: 24px 16px;
    border-radius: 16px;
  }
  
  .user-greeting.collapsed .datetime-display {
    padding: 14px 16px;
  }
  
  .study-stats {
    padding: 20px;
    border-radius: 16px;
  }
  
  .motivation {
    padding: 14px 20px;
    font-size: 13px;
    border-radius: 12px;
  }
  
  .user-greeting.collapsed .motivation {
    padding: 10px 16px;
    font-size: 12px;
  }
}

/* 扁平风格弹窗样式 */
:global(.glass-messagebox) {
  background: #ffffff !important;
  backdrop-filter: none !important;
  border: none !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
}

:global(.glass-messagebox.verification-modal) {
  min-width: 420px !important;
}

:global(.glass-messagebox .el-message-box__header) {
  background: transparent !important;
  border-bottom: none !important;
  padding: 32px 24px 8px !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__title) {
  color: #2c3e50 !important;
  font-weight: 600 !important;
  font-size: 24px !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__content) {
  padding: 8px 24px 32px !important;
  background: transparent !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__message) {
  color: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__btns) {
  display: none !important;
}

/* 验证码输入框容器 */
:global(.verification-code-container) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 24px 0 !important;
}

/* 验证码单个数字输入框 */
:global(.verification-digit-input) {
  width: 40px !important;
  height: 50px !important;
  text-align: center !important;
  font-size: 24px !important;
  font-weight: 600 !important;
  color: #2c3e50 !important;
  background: #f8f9fa !important;
  border: 2px solid #e9ecef !important;
  border-radius: 10px !important;
  outline: none !important;
  transition: all 0.3s ease !important;
  letter-spacing: 0px !important;
}

:global(.verification-digit-input:focus) {
  border-color: #3498db !important;
  background: #ffffff !important;
  transform: scale(1.05) !important;
  box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.2) !important;
}

/* 输入完成状态 */
:global(.verification-digit-input.input-filled) {
  border-color: #27ae60 !important;
  background: #ffffff !important;
  color: #27ae60 !important;
}

/* 输入错误状态 */
:global(.verification-digit-input.input-error) {
  border-color: #e74c3c !important;
  background: #ffffff !important;
  color: #e74c3c !important;
  animation: shake 0.5s ease-in-out !important;
}

/* 成功动画 */
:global(.verification-digit-input.input-success) {
  border-color: #27ae60 !important;
  background: #ffffff !important;
  color: #27ae60 !important;
  animation: pulse-success 0.6s ease-in-out !important;
}

/* 抖动动画（错误反馈） */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}

/* 脉冲动画（成功反馈） */
@keyframes pulse-success {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(39, 174, 96, 0.3); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
}

/* 容器成功动画 */
:global(.verification-code-container.all-filled) {
  animation: container-success 0.8s ease-in-out !important;
}

@keyframes container-success {
  0% { transform: scale(1); }
  30% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 遮罩层样式 */
:global(.el-overlay) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: none !important;
}

/* 响应式适配 */
@media (max-width: 768px) {
  :global(.glass-messagebox.verification-modal) {
    min-width: 350px !important;
    margin: 20px !important;
  }
  
  :global(.verification-code-container) {
    gap: 12px !important;
    padding: 20px 0 !important;
  }
  
  :global(.verification-digit-input) {
    width: 36px !important;
    height: 46px !important;
    font-size: 22px !important;
  }
}

@media (max-width: 480px) {
  :global(.glass-messagebox.verification-modal) {
    min-width: 320px !important;
    margin: 16px !important;
  }
  
  :global(.verification-code-container) {
    gap: 8px !important;
    padding: 16px 0 !important;
  }
  
  :global(.verification-digit-input) {
    width: 34px !important;
    height: 44px !important;
    font-size: 20px !important;
  }
}
</style>
