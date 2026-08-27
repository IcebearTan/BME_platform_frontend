import { test, expect } from '@playwright/test'

const API = 'http://127.0.0.1:5002'

test('预览 API 提供管理端关键数据契约', async ({ request }) => {
  const sessionResponse = await request.get(`${API}/camp/sessions/1`)
  expect(sessionResponse.ok()).toBeTruthy()
  const { session } = await sessionResponse.json()
  expect(session.mentor_selection_enabled).toBe(true)

  const membersResponse = await request.get(`${API}/camp/sessions/1/members`)
  const { members } = await membersResponse.json()
  expect(members.filter((member) => member.role === 'mentor')).toHaveLength(8)
  expect(members.filter((member) => member.role === 'student')).toHaveLength(20)

  const usersResponse = await request.get(`${API}/user/user_list`)
  expect(await usersResponse.json()).toHaveLength(33)
})

test('预览 API 已知空列表有固定结构', async ({ request }) => {
  const response = await request.get(`${API}/camp/sessions/1/courses`)
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ code: 200, courses: [] })
})

test('预览 API 未实现路由明确返回 404', async ({ request }) => {
  const response = await request.get(`${API}/not-implemented`)
  expect(response.status()).toBe(404)
  expect(await response.json()).toEqual({
    code: 404,
    message: 'Preview API route not implemented: GET /not-implemented',
  })
})
