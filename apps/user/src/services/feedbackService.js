import api from '../api'

export const feedbackService = {
  create: form => api.post('/feedback-tickets', form).then(response => response.data),
}
