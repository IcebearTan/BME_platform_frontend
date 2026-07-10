<!-- 使用vue3语法 -->
<script setup>
import api from '../../api';
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { DewCard, DewInput, DewButton, DewTag, DewButtonBar } from '../ui'

const store = useStore()

import AvatarUploadComponent from './AvatarUploadComponent.vue';

const splitStringBySpace = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(' ');
};

const joinArrayWithSpace = (arr) => {
  return arr.join(' ');
};

const fetchAvatar = async () => {
  await api({
      url: "/user/user_avatars",
      method: "get",
  }).then((res) => {
      if (res.data.code == 200) {
          if (res.data.User_Avatar && res.data.User_Avatar !== null) {
              store.commit('setAvatar', res.data.User_Avatar)
          } else {
              store.commit('setAvatar', null)
          }
      }
  }).catch((error) => {
      console.error('获取头像失败:', error)
      store.commit('setAvatar', null)
  })
}

const fetchUserInfo = async () => {
  await api({
      url: "/user/user_index",
      method: "get",
  }).then((res) => {
      if (res.data.code == 200) {
          store.commit('setUser', res.data)
      }
  })
}

const props = defineProps({
  User_Info: {
    type: Object,
    required: true,
  }
})

const form = reactive({
  username: '',
  gender: '',
  college: '',
  major: '',
  introduction: '',
  GithubId: '',
  Student_Id: '',
  tags: [],
})

const formRef = ref(null)

const rules = {
  username: [
    { message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 15, message: '姓名长度需要在2-15个字符之间', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const isChinese = /^[一-龥]+$/.test(value);
        if (!isChinese) {
          callback(new Error('用户名必须为中文'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ]
}

// 性别（DewButtonBar 分段选择，避免 el-select 在暗色下不适配）
const genderOptions = [
  { value: '男性', label: '男性' },
  { value: '女性', label: '女性' },
  { value: '武装直升机', label: '武装直升机' },
  { value: '沃尔玛购物袋', label: '沃尔玛购物袋' },
]

// 技能标签：DewInput 回车添加 + DewTag 展示（替代 el-input-tag）
const tagInput = ref('')
const tagTypes = ['primary', 'success', 'info', 'warning', 'danger']
const tagType = (i) => tagTypes[i % tagTypes.length]
const addTag = () => {
  const v = tagInput.value.trim()
  if (!v) return
  if (form.tags.length >= 10) {
    ElMessage.warning('最多 10 个标签')
    return
  }
  if (!form.tags.includes(v)) form.tags.push(v)
  tagInput.value = ''
}
const removeTag = (i) => {
  form.tags.splice(i, 1)
}

const tagsCount = computed(() => form.tags ? form.tags.length : 0)

// loading 绑定真实数据：等 User_Info 填充表单后才消失（替代原来两个假 500ms）
const loading = ref(true)

const populateForm = (info) => {
  form.username = info.User_Name
  form.gender = info.User_Sex
  form.college = info.College
  form.major = info.Major
  form.introduction = info.Introduction
  form.GithubId = info.Github_Id
  form.Student_Id = info.Student_Id || ''
  form.tags = splitStringBySpace(info.Skill_Tags)
}

// User_Info 由父组件异步拉取后作为 prop 传入；拿到就填充并关掉 loading
watch(() => props.User_Info, (info) => {
  if (info && info.User_Name !== undefined) {
    populateForm(info)
    loading.value = false
  }
}, { immediate: true })

const onSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      api({
        url: '/user/user/edit',
        method: 'post',
        data: {
          Github_Id: form.GithubId,
          Student_Id: form.Student_Id,
          College: form.college,
          Introduction: form.introduction,
          Major: form.major,
          Sex: form.gender,
          Skill_Tags: joinArrayWithSpace(form.tags),
          User_Name: form.username
        }
      }).then(res => {
        if (res.data.code === 200) {
          setTimeout(() => {
            window.location.reload()
          }, 500)
          fetchAvatar()
          fetchUserInfo()
          ElMessage({ type: 'success', message: '用户信息修改成功！正在审核！' })
        } else {
          ElMessage({ type: 'error', message: '用户信息修改失败！' })
        }
      }).catch(err => {
        console.log(err)
        ElMessage({ type: 'error', message: '未知的错误！' })
      })
    } else {
      ElMessage({ type: 'error', message: '用户信息修改失败！' })
    }
  })

}
</script>

<template>
  <div class="uc-userinfo">
    <DewCard
      size="lg"
      divided
      class="userinfo-card"
      v-loading="loading"
      element-loading-background="transparent"
      :delay="0"
      element-loading-text="loading..."
    >
      <template #header>账户设置</template>

      <!-- 头像上传 -->
      <div class="avatar-block">
        <AvatarUploadComponent />
        <div class="avatar-hint">上传头像</div>
      </div>

      <!-- 表单（保留 el-form 做校验；输入控件换成 DewUI，靠 token 自动适配亮/暗） -->
      <el-form
        ref="formRef"
        :model="form"
        label-position="top"
        :rules="rules"
        class="userinfo-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="username">
              <DewInput v-model="form.username" placeholder="输入你的真实姓名" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学号">
              <DewInput v-model="form.Student_Id" placeholder="你的学号" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学校">
              <DewInput v-model="form.college" placeholder="学校名称" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业">
              <DewInput v-model="form.major" placeholder="所在专业" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="GitHub ID">
          <DewInput v-model="form.GithubId" placeholder="你的 Github 用户名" clearable />
        </el-form-item>

        <el-form-item label="性别">
          <DewButtonBar :items="genderOptions" v-model="form.gender" />
        </el-form-item>

        <el-form-item label="个人简介">
          <DewInput
            v-model="form.introduction"
            type="textarea"
            :rows="4"
            placeholder="简单介绍一下自己吧~"
          />
        </el-form-item>

        <el-form-item label="技能标签">
          <div class="tag-editor">
            <div v-if="tagsCount" class="tag-chips">
              <DewTag v-for="(tag, i) in form.tags" :key="i" :type="tagType(i)" size="sm" round class="tag-chip">
                {{ tag }}
                <button type="button" class="tag-remove" @click="removeTag(i)" aria-label="移除">×</button>
              </DewTag>
            </div>
            <DewInput
              v-model="tagInput"
              placeholder="输入技能后回车添加（最多 10 个）"
              @enter="addTag"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <DewButton :active="true" @click="onSubmit">保存</DewButton>
        </el-form-item>
      </el-form>
    </DewCard>
  </div>
</template>

<style scoped>
.uc-userinfo {
  width: 100%;
}

.userinfo-card {
  width: 100%;
}

/* 头像上传区 */
.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.avatar-hint {
  font-size: 13px;
  color: var(--dew-text-faint);
}

/* 表单：DewInput 自带玻璃质感；el-form 仅做排版 + 校验 */
.userinfo-form {
  width: 100%;
}

.userinfo-form :deep(.el-form-item__label) {
  color: var(--dew-text-heading);
  font-weight: 600;
  font-size: 13px;
  padding-bottom: 4px;
}

.userinfo-form :deep(.el-form-item__error) {
  color: var(--color-danger);
}

/* 技能标签编辑器 */
.tag-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  /* DewTag 是 inline-flex，移除按钮嵌在里面 */
  gap: 4px;
}

.tag-remove {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.tag-remove:hover {
  opacity: 1;
}
</style>
