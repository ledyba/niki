// from
// https://github.com/IGionny/TypescriptVueJsTipTap
declare module 'tiptap' {
  import Vue from 'vue';

  class EditorContent extends Vue {
      editor(editor: Editor) : void;
  }
  class EditorMenuBar extends Vue { }
  class EditorMenuBubble extends Vue { }
  class Emitter {
      on(event: any, fn: Function): Emitter;
      emit(event: any, ...args: any[]): Emitter;
      off(event: any, fn: Function): Emitter;
  }


  interface IEmptyDocument {
      type: string;
      content: any[];
  }

  interface EditorSettings {
      editorProps?: object,
      editable?: boolean,
      autoFocus?: any,
      extensions?: any[],
      content?: string,
      emptyDocument?: IEmptyDocument;

      useBuiltInExtensions?: boolean;
      disableInputRules?: boolean;
      disablePasteRules?: boolean;
      dropCursor?: object;
      parseOptions?: object;
      injectCSS?: boolean;
      onInit?: () => {};
      onTransaction?: () => {};
      onUpdate?: () => {};
      onFocus?: () => {};
      onBlur?: () => {};
      onPaste?: () => {};
      onDrop?: () => {};
  }


  class Editor extends Emitter {
      destroy(): void;
      constructor(settings: EditorSettings);
  }

  export { Editor, EditorContent, EditorMenuBar, EditorMenuBubble, EditorSettings }
}

declare module 'tiptap-extensions' {

  import { Editor } from 'tiptap';

  class Extension {
      init(): null;
      bindEditor(editor: Editor | null): void;
      name: string | null;
      type: string | null;
      update: Function;
      defaultOptions: object;
      plugins: any[];
      inputRules: any[];
      pasteRules: any[];
      keys(): object;
  }

  class Mark extends Extension {
      constructor(options?: any);
      view: string | null;
      schema: object | null;
      command(): Function;
  }

  class Node extends Extension{
      constructor(options?: any);
  }

  class Blockquote extends Node {}
  class CodeBlock extends Node {}
  class HardBreak extends Node {}
  class Heading extends Node {}
  class OrderedList extends Node {}
  class BulletList extends Node {}
  class ListItem extends Node {}
  class TodoItem extends Node {}
  class TodoList extends Node {}
  class Bold extends Node {}
  class Code extends Node {}
  class Italic extends Node {}
  class Link extends Node {}
  class Strike extends Node {}
  class Underline extends Node {}
  class History extends Node {}


  export {
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
    History
  }

}
