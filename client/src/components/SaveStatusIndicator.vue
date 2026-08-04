<template>
  <div class="save-status" :class="`save-status--${status.kind}`">
    <template v-if="status.kind === 'saving'">
      <span class="save-status__spinner" aria-hidden="true"></span>
      <span class="save-status__label">保存中</span>
    </template>
    <template v-else-if="status.kind === 'saved'">
      <span class="save-status__label">☑ 保存しました</span>
    </template>
    <template v-else-if="status.kind === 'error'">
      <span class="save-status__label">✖ エラー：{{ status.message }}</span>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export type SaveStatusKind = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveStatus {
  kind: SaveStatusKind;
  message: string;
}

const SaveStatusIndicator = defineComponent({
  name: 'SaveStatusIndicator',
  props: {
    status: {
      type: Object as PropType<SaveStatus>,
      required: false,
      default: (): SaveStatus => ({ kind: 'idle', message: '' }),
    },
  },
});

export default SaveStatusIndicator;
</script>

<style scoped lang="scss">
.save-status {
  display: flex;
  align-items: center;
  min-height: 1.5em;
  margin-top: 0.5em;
  font-size: 0.85em;
  line-height: 1.5;
}

.save-status--saved .save-status__label {
  color: #2e7d32;
}

.save-status--error .save-status__label {
  color: #c62828;
}

.save-status__spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 0.5em;
  border: 2px solid rgba(44, 62, 80, 0.25);
  border-top-color: #2c3e50;
  border-radius: 50%;
  animation: save-status-spin 0.8s linear infinite;
}

@keyframes save-status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
