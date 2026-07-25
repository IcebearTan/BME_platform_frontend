<script>
export default {
  name: 'App',
  computed: {
    isDarkMode() {
      return this.$store.getters.isDarkMode;
    }
  },
  watch: {
    isDarkMode: {
      handler(val) {
        document.body.classList.toggle('theme-dark', val);
        document.body.classList.toggle('theme-light', !val);
      },
      immediate: true
    }
  }
};
</script>

<template>
  <div id="app" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <router-view />
  </div>
</template>

<style scoped></style>
