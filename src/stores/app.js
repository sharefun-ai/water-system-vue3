import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export const useAppStore = defineStore('app', () => {
  const isMenuOpen = ref(false)
  const isDemoMode = ref(true)

  const currentTimestamp = ref('')

  // Update clock
  function updateClock() {
    const now = new Date()
    currentTimestamp.value = now.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Start clock
  updateClock()
  setInterval(updateClock, 1000)

  function toggleMenu() {
    isMenuOpen.value = !isMenuOpen.value
  }

  function closeMenu() {
    isMenuOpen.value = false
  }

  return {
    isMenuOpen,
    isDemoMode,
    currentTimestamp,
    toggleMenu,
    closeMenu,
  }
})
