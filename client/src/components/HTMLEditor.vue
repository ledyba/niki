<template>
  <div>
    <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
      <button :class="{ 'is-active': isActive.bold() }" @click="commands.bold">
        Bold
      </button>
    </editor-menu-bar>
    <editor-content :editor="editor" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { Editor, EditorContent, EditorMenuBubble, EditorMenuBar } from 'tiptap';
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

export default class HTMLEditor extends Vue {
  editor: Editor | null = null;
  mounted() {
    this.editor = new Editor({
      content: "<p>This is just a boring paragraph</p>",
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
    });
  }
  beforeDestroy() {
    if (this.editor !== null) {
      this.editor.destroy();
    }
  }
}
</script>