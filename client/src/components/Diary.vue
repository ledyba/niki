<template>
  <div class="diary">
    <div>{{ `0000${diary.year}`.slice(-4) }}/{{ `00${diary.month}`.slice(-2) }}/{{ `00${diary.day}`.slice(-2) }}</div>
    <quill-editor
        ref="myQuillEditor"
        v-model="content"
        @blur="onEditorBlur($event)"
        @focus="onEditorFocus($event)"
        @ready="onEditorReady($event)"
    />
  </div>
</template>

<script lang="ts">
// https://qiita.com/simezi9/items/c27d69f17d2d08722b3a
import { defineComponent } from "vue";
import * as bridge from "bridge";
import Editor, {EditorChangeEvent} from '@/components/Editor.vue'
import {Quill} from 'quill';

const Diary = defineComponent({
  components: {
    'quill-editor': Editor,
  },
  props: {
    diary: {
      type: Object,
      required: false,
      default: () => ({} as bridge.Entity.Diary)
    },
  },
  data() {
    return {
    }
  },
  methods: {
    onEditorBlur(quill: Quill) {
      console.log('editor blur!', quill)
    },
    onEditorFocus(quill: Quill) {
      console.log('editor focus!', quill)
    },
    onEditorReady(quill: Quill) {
      console.log('editor ready!', quill)
    },
    onEditorChange(change: EditorChangeEvent) {
      console.log('editor change!', change.quill, change.html, change.text);
      this.content = change.html;
    }
  },
  computed: {
    content: {
      get: function(): string {
        return this.diary.text;
      },
      set: function(value: string) {
        this.$emit('change', value)
      }
    }
  },
});

export default Diary;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
a {
  color: #ffffff;
  text-decoration: none;
}
</style>
