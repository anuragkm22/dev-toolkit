import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput } from "@codemirror/language";
import type { Format } from "../shared/diff/detectFormat";

/**
 * A thin wrapper around a CodeMirror 6 EditorView, exposing a small
 * textarea-like interface (get/set value, onChange) so the rest of the
 * app doesn't need to know about CodeMirror's internals.
 *
 * Syntax highlighting language (JSON vs YAML) can be switched at runtime
 * via setLanguage(), since a panel's format can change (auto-detect,
 * manual toggle, or format conversion).
 */
export class CodeEditor {
  private readonly view: EditorView;
  private readonly languageConfig = new Compartment();
  private onChangeCallback: (() => void) | null = null;

  constructor(parent: HTMLElement, initialFormat: Format, placeholderText: string) {
    const state = EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        placeholder(placeholderText),
        this.languageConfig.of(languageExtension(initialFormat)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.onChangeCallback?.();
          }
        }),
      ],
    });

    this.view = new EditorView({ state, parent });
  }

  get value(): string {
    return this.view.state.doc.toString();
  }

  set value(text: string) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
    });
  }

  /** Swaps the active syntax highlighting language (JSON <-> YAML). */
  setLanguage(format: Format): void {
    this.view.dispatch({
      effects: this.languageConfig.reconfigure(languageExtension(format)),
    });
  }

  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  focus(): void {
    this.view.focus();
  }
}

function languageExtension(format: Format) {
  return format === "json" ? json() : yaml();
}
