<template>
  <div class="container">
    <div class="code-card">
        <!-- <div class="title">你的签到/签退码</div> -->
        <div class="code-box">
            <div v-if="!isCodeInvalid" class="title">你还没有码</div>
            <div v-else class="code">
                <template v-if="cnt >= validTime">
                    <div class="expired-container">
                        <div class="expired-icon">⏰</div>
                        <div class="expired-text">签到码已过期</div>
                        <div class="expired-tip">请点击下方按钮重新生成</div>
                    </div>
                </template>
                <template v-else>
                    <div class="qr-container">
                        <canvas ref="qrCanvas" class="qr-code"></canvas>
                        <div class="code-display">
                            <div class="code-label">{{ actionText }}码：
                                <span class="code-value">{{ code }}</span>
                            </div>
                        </div>
                        <div class="scan-tip">建议扫码{{ actionText }}</div>
                        <div class="time-remaining">剩余时间：{{ Math.floor((validTime - cnt) / 60) }}:{{ String((validTime - cnt) % 60).padStart(2, '0') }}</div>
                    </div>
                </template>
            </div>
        </div>
        <div class="button-box">
            <el-button type="primary" size="large" @click="handleCheckIn">签到</el-button>
            <el-button type="danger" size="large" @click="handleCheckOut">签退</el-button>
        </div>
    </div>
  </div>

    <div class="help-tip">
        <span class="help-icon">❓</span>
        <a href="#" @click.prevent="showHelpDialog" class="help-link">如何签到/签退？</a>
    </div>
  
  <!-- 帮助对话框 -->
  <el-dialog v-model="helpDialogVisible" title="签到/签退使用指南" width="500px" center>
    <div class="help-content">
      <div class="help-section">
        <h4>📱 扫码方式（推荐）</h4>
        <ol>
          <li>点击"签到"或"签退"按钮生成二维码</li>
          <li>使用手机自带扫码工具扫描二维码，或者使用微信扫码</li>
          <li>第一次扫码可能提示错误，请先登录后再次尝试</li>
        </ol>
      </div>
      
      <div class="help-section">
        <h4>🔢 手动输入方式</h4>
        <ol>
          <li>点击"签到"或"签退"按钮</li>
          <li>记下显示的签到码</li>
          <li>在主页右侧签到组件输入该代码</li>
        </ol>
      </div>
      
      <div class="help-section">
        <h4>⚠️ 注意事项</h4>
        <ul>
          <li>必须连接TP-106/TP-110/TP-112的WIFI</li>
          <li>签到码有效期为5分钟，每个签到码只能使用一次</li>
          <li>建议使用扫码方式，更加便捷准确</li>
        </ul>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="helpDialogVisible = false" type="primary">我知道了</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage, ElDialog, ElButton } from 'element-plus'
import QRCode from 'qrcode'
import api from '../api';

// 定义Code结构体
const CodeInfo = {
    code: null,
    generationTime: null,
    type: null // 'check_in' 或 'check_out'
}

// 分配本地内存存储Code信息
const codeMemory = ref({
    currentCode: null,
    generationTime: null,
    type: null
})

// // 本地持久化存储Key
const LOCAL_STORAGE_KEY = 'attendence_code_info'

// 更新内存和localStorage中的Code信息
const updateCodeMemory = (newCode, codeType) => {
    const info = {
        currentCode: newCode,
        generationTime: new Date().toISOString(),
        type: codeType
    }
    codeMemory.value = info
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(info))
    console.log('Code内存已更新:', codeMemory.value)
}

// 页面加载时从localStorage恢复Code信息
const restoreCodeFromLocal = async () => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (data) {
        const info = JSON.parse(data)
        if (info.currentCode && info.generationTime) {
            // 判断是否过期
            const now = new Date()
            const genTime = new Date(info.generationTime)
            const diffSeconds = Math.floor((now - genTime) / 1000)
            if (diffSeconds < validTime) {
                code.value = info.currentCode
                isCodeInvalid.value = true
                cnt.value = diffSeconds
                codeMemory.value = info
                
                // 等待DOM更新后生成二维码
                await nextTick()
                await generateQRCode(info.currentCode, info.type)
            } else {
                // 已过期
                code.value = null
                isCodeInvalid.value = true
                cnt.value = validTime
                codeMemory.value = { currentCode: null, generationTime: null, type: null }
            }
        }
    }
}

const code = ref(null)
const isCodeInvalid = ref(false)
const validTime = 300
const cnt = ref(0)
const qrCanvas = ref(null)
const helpDialogVisible = ref(false)

// 根据当前代码类型动态显示文字
const actionText = computed(() => {
    return codeMemory.value.type === 'check_out' ? '签退' : '签到'
})

// 显示帮助对话框
const showHelpDialog = () => {
    helpDialogVisible.value = true
}

// 生成二维码
const generateQRCode = async (codeValue, codeType) => {
    if (!qrCanvas.value) return
    
    const qrUrl = `http://172.25.56.83:8080/scan?code=${codeValue}&type=${codeType}`
    
    try {
        await QRCode.toCanvas(qrCanvas.value, qrUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        })
    } catch (error) {
        console.error('生成二维码失败:', error)
        ElMessage.error('生成二维码失败')
    }
}

const countTime = () => {
    if (isCodeInvalid) {
        cnt.value++
    }
}

const handleCheckIn = async () => {
    try {
        const response = await api({
            url: '/generate-code',
            method: 'post',
            data: {
                type: 'check_in',
            }
        })
        if (response.data) {
            code.value = response.data.check_code
            isCodeInvalid.value = true
            cnt.value = 0
            // 更新内存中的Code信息
            updateCodeMemory(response.data.check_code, 'check_in')
            
            // 等待DOM更新后生成二维码
            await nextTick()
            await generateQRCode(response.data.check_code, 'check_in')
            
            ElMessage.success('生成成功!请在5分钟内扫码签到')
        } else {
            ElMessage.error('生成失败')
        }
    } catch (error) {
        if (error.response.status == 429) {
            ElMessage.error('频繁请求，5秒后再试')
        } else {
            ElMessage.error('生成失败')
        }
    }
}
const handleCheckOut = async () => {
    try {
        const response = await api({
            url: '/generate-code',
            method: 'post',
            data: {
                type: 'check_out',
            }
        })
        if (response.data) {
            code.value = response.data.check_code
            isCodeInvalid.value = true
            cnt.value = 0
            // 更新内存中的Code信息
            updateCodeMemory(response.data.check_code, 'check_out')
            
            // 等待DOM更新后生成二维码
            await nextTick()
            await generateQRCode(response.data.check_code, 'check_out')
            
            ElMessage.success('生成成功!请在5分钟内扫码签退')
        } else {
            ElMessage.error('生成失败')
        }
    } catch (error) {
        if (error.response.status == 429) {
            ElMessage.error('频繁请求，5秒后再试')
        } else {
            ElMessage.error('生成失败')
        }
    }
}

onMounted(async () => {
    await restoreCodeFromLocal()
    setInterval(() => {
        countTime()
    }, 1000)
})

</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
.code-card{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 400px;
    height: 430px;
    border-radius: 10px;
    background-color: #ffffff;
    box-shadow: #f2f2f2 0px 0px 10px 0px;

    padding: 20px;
}
.title{
    font-size: 20px;
    font-weight: 600;
    color: #333333;
}
.code{
    font-weight: 600;
}
.expired-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    padding: 30px 20px;
    background-color: #feebe7;
    border-radius: 12px;
    border: 2px solid #f55742;
    box-shadow: 0 2px 8px rgba(245, 200, 66, 0.15);
    min-height: 150px;
    justify-content: center;
}
.expired-icon {
    font-size: 48px;
    opacity: 0.8;
}
.expired-text {
    font-size: 20px;
    color: #f55742;
    font-weight: 600;
}
.expired-tip {
    font-size: 14px;
    color: #909399;
    font-weight: 500;
    text-align: center;
}
.qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}
.qr-code {
    border: 2px solid #e6e6e6;
    border-radius: 8px;
    padding: 10px;
    background-color: #ffffff;
}
.scan-tip {
    font-size: 16px;
    color: #409EFF;
    font-weight: 500;
}
.time-remaining {
    font-size: 14px;
    color: #909399;
    font-weight: 500;
}
.code-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e6e6e6;
}
.code-label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
}
.code-value {
    font-size: 18px;
    color: #333;
    font-weight: 600;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
}
.help-tip {
    display: flex;
    width: 175px;
    align-items: center;
    gap: 8px;
    margin-top: 15px;
    padding: 8px 12px;
    background-color: #f0f9ff;
    border-radius: 6px;
    border: 1px solid #e1f5fe;
}
.help-icon {
    font-size: 16px;
    opacity: 0.8;
}
.help-link {
    color: #409EFF;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.3s ease;
}
.help-link:hover {
    color: #337ecc;
    text-decoration: underline;
}
.help-content {
    line-height: 1.6;
}
.help-section {
    margin-bottom: 20px;
}
.help-section h4 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 16px;
    font-weight: 600;
}
.help-section ol, .help-section ul {
    margin: 0;
    padding-left: 20px;
}
.help-section li {
    margin-bottom: 5px;
    color: #666;
    font-size: 14px;
}
.dialog-footer {
    display: flex;
    justify-content: center;
}
</style>
