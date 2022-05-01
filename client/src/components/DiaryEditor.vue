<template>
  <div class="quill-editor">
    <slot name="toolbar"></slot>
    <div ref="editor"></div>
  </div>
</template>

<script lang="ts">
// https://github.com/surmon-china/vue-quill-editor
import { defineComponent } from 'vue';
import Quill, {QuillOptionsStatic} from 'quill';
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'

export interface EditorChangeEvent {
  quill: Quill;
  html: string;
  text: string;
}

const defaultOptions: QuillOptionsStatic = {
  theme: 'snow',
  bounds: document.body,
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  },
  placeholder: 'Insert text here ...',
  readOnly: false
}

const DiaryEditor = defineComponent({
  name: 'quill-editor',
  data: function() {
    return {
      options_: {} as QuillOptionsStatic,
      content_: '',
      quill: null as (Quill | null),
      defaultOptions
    };
  },
  props: {
    content: String,
    disabled: {
      type: Boolean,
      default: false
    },
    options: {
      type: Object,
      required: false,
      default: () => ({})
    },
    globalOptions: {
      type: Object,
      required: false,
      default: () => ({})
    },
    focused: {
      type: Boolean,
      required: false,
      default: () => false
    }
  },
  mounted: function() {
    this.initialize();
    if(this.focused) {
      window.requestAnimationFrame(()=>{
        this.focus();
      });
    }
  },
  beforeUnmount: function() {
    this.quill = null;
  },
  methods: {
    // Init Quill instance
    initialize: function () {
      if (this.$el) {
        // Set editor content
        if (this.content !== undefined) {
          //this.quill.clipboard.dangerouslyPasteHTML(this.content);
          (this.$refs.editor as HTMLDivElement).innerHTML = this.content;
        }
        // Options
        this.options_ = Object.assign({}, this.defaultOptions, this.globalOptions, this.options)
        // Instance
        this.quill = new Quill(this.$refs.editor as HTMLElement, this.options_);
        this.quill.blur();
        this.quill.enable(!this.disabled);
        // Mark model as touched if editor lost focus
        this.quill.on('selection-change', range => {
          if (!range) {
            this.$emit('blur', this.quill);
          } else {
            this.$emit('focus', this.quill);
          }
        });
        // Update model if text changes
        this.quill.on('text-change', (delta, oldDelta, source) => {
          if(this.quill === null) {
            return;
          }
          let html = (this.$refs.editor as HTMLElement).children[0].innerHTML;
          const quill = this.quill;
          const text = this.quill.getText();
          if (html === '<p><br></p>') html = '';
          this.content_ = html;
          this.$emit('input', this.content_);
          const event: EditorChangeEvent = {
            html: html,
            text: text,
            quill: quill,
          };
          this.$emit('change', event);
        });
        // Emit ready event
        this.$emit('ready', this.quill);
      }
    },
    focus: function () {
      if(this.quill !== null) {
        this.quill.focus();
        this.quill.setSelection(this.quill.getLength(),0);
      }
    }
  },
  watch: {
    // Watch content change
    content: function (newVal, oldVal) {
      if (this.quill) {
        if (newVal && newVal !== oldVal && newVal !== this.content_) {
          this.content_ = newVal
          this.quill.clipboard.dangerouslyPasteHTML(newVal);
        } else if (!newVal) {
          this.quill.setText('')
        }
      }
    },
    focused: function (newVal, oldVal) {
      if (this.quill !== null && newVal !== oldVal) {
        if(newVal) {
          window.requestAnimationFrame(()=>{
            this.focus();
          });
        }
      }
    },
    // Watch disabled change
    disabled: function (newVal, oldVal) {
      if (this.quill !== null && newVal !== oldVal) {
        this.quill.enable(!newVal);
      }
    },
  }
});

export default DiaryEditor;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
