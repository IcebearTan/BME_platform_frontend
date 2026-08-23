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
  <div class="auth-page aurora-bg">
    <Register />
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}
</style>
