<template>
  <div>
    <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
      <button :class="{ 'is-active': isActive.bold() }" @click="commands.bold">
        Bold
      </button>
    </editor-menu-bar>
    <editor-content v-bind:editor="editor" />
  </div>
</template>

<script lang="ts">
import { Editor, EditorContent, EditorMenuBar } from 'tiptap';
import {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  OrderedList,
  BulletList,
  ListItem,
  TodoItem,
  TodoList,
  Bold,
  Code,
  Italic,
  Link,
  Strike,
  Underline,
  History,
} from 'tiptap-extensions';

import { defineComponent } from "vue";

const HTMLEditor = defineComponent({
  components: {
    EditorContent,
    EditorMenuBar,
  },
  props: {
    content: String,
  },
  data() {
    return {
      editor: new Editor({
        content: ``,
        extensions: [
          new Blockquote(),
          new CodeBlock(),
          new HardBreak(),
          new Heading({ levels: [1, 2, 3] }),
          new BulletList(),
          new OrderedList(),
          new ListItem(),
          new TodoItem(),
          new TodoList(),
          new Bold(),
          new Code(),
          new Italic(),
          new Link(),
          new Strike(),
          new Underline(),
          new History(),
        ],
      }),
    };
  }
});

export default HTMLEditor;
</script>