export const EDUCATION_EMAIL_DOMAINS = ['mail2.sysu.edu.cn', 'mail.sysu.edu.cn']

export function isEducationEmail(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._+-]+@mail(?:2)?\.sysu\.edu\.cn$/i.test(value.trim())
}
