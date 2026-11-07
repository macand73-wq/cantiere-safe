<template>
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(d, i) in paths"
      :key="i"
      :d="d"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type IconName =
  | 'home'
  | 'cantieri'
  | 'sopralluoghi'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'download'
  | 'logout'
  | 'settings'

const props = defineProps<{ name: IconName }>()

// Original stroke icons, hand-drawn on a 24x24 grid (no copied library paths).
const ICONS: Record<IconName, string[]> = {
  home: ['M3 11.5 12 4l9 7.5', 'M5 10v11h14V10', 'M9 21v-6h6v6'],
  cantieri: [
    'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17',
    'M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2',
  ],
  sopralluoghi: [
    'M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1',
    'M8 4h8a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
    'M9 9h6M9 13h6M9 17h4',
  ],
  plus: ['M12 5v14M5 12h14'],
  edit: ['M12 20h9', 'M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z'],
  trash: [
    'M3 6h18',
    'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
    'M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14',
  ],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  logout: [
    'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3',
    'M16 17l5-5-5-5',
    'M21 12H9',
  ],
  settings: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2M12 20v2M2 12h2M20 12h2',
    'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4',
    'M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4',
  ],
}

const paths = computed(() => ICONS[props.name])
</script>

<style scoped>
.app-icon {
  width: 1.1em;
  height: 1.1em;
  flex-shrink: 0;
  vertical-align: -0.125em;
}
</style>
