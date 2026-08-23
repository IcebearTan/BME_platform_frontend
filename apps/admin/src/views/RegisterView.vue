<script>
import Register from '../components/RegisterComponent.vue';

export default {
  name: 'RegisterView',
  components: {
    Register
  },
};
</script>

<template>
  <div class="auth-page">
    <Register />
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 55% 50% at 12% 18%, rgba(96, 165, 250, 0.18), transparent 60%),
    radial-gradient(ellipse 60% 55% at 88% 88%, rgba(52, 211, 153, 0.15), transparent 60%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark .auth-page {
  background:
    radial-gradient(ellipse 55% 50% at 12% 18%, rgba(59, 130, 246, 0.12), transparent 60%),
    radial-gradient(ellipse 60% 55% at 88% 88%, rgba(16, 185, 129, 0.10), transparent 60%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}
</style>
