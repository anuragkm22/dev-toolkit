import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder, Decoration, type DecorationSet } from "@codemirror/view";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput } from "@codemirror/language";
import type { Format } from "./diff/detectFormat";

/**
 * A CodeMirror 6 editor wrapper dedicated to the standalone validator
 * pages (/json-validator/, /yaml-validator/). Deliberately separate
 * from shared/codeEditor.ts (used by the diff tool) rather than
 * extending it, so nothing built here can ever affect the diff tool's
 * behavior — this file adds inline error-highlighting support that the
 * diff tool doesn't need and shouldn't be exposed to.
 */

/** Sets or clears the highlighted error position. Pass null to clear. */
const setErrorHighlight = StateEffect.define<{ line: number; column: number } | null>();

const errorHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setErrorHighlight)) {
        if (effect.value === null) {
          return Decoration.none;
        }
        return buildErrorDecoration(tr.state, effect.value.line, effect.value.column);
      }
    }
    // Keep decorations in sync with any document edits (e.g. if the
    // user types while an error is shown, the underline should track
    // the same character rather than drifting to the wrong spot).
    if (tr.docChanged) {
      return decorations.map(tr.changes);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Builds a decoration underlining the single character at the given
 * 1-indexed line/column, or the whole line if the column is out of range
 * (e.g. an end-of-line error). */
function buildErrorDecoration(state: EditorState, line: number, column: number): DecorationSet {
  const clampedLine = Math.min(Math.max(line, 1), state.doc.lines);
  const lineInfo = state.doc.line(clampedLine);

  const from = Math.min(lineInfo.from + Math.max(column - 1, 0), lineInfo.to);
  const to = from < lineInfo.to ? from + 1 : from;

  const mark = Decoration.mark({ class: "cm-error-highlight" });

  if (from === to) {
    // End of line / empty line — highlight the whole line instead of a
    // zero-width mark, so there's still something visible.
    return Decoration.set([Decoration.line({ class: "cm-error-line" }).range(lineInfo.from)]);
  }

  return Decoration.set([mark.range(from, to)]);
}

export class ValidatorEditor {
  private readonly view: EditorView;
  private onChangeCallback: (() => void) | null = null;

  constructor(parent: HTMLElement, format: Format, placeholderText: string) {
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
        format === "json" ? json() : yaml(),
        errorHighlightField,
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
      effects: setErrorHighlight.of(null),
    });
  }

  /** Highlights the exact character (or line, if out of range) where a
   * validation error occurred. */
  highlightError(line: number, column: number): void {
    this.view.dispatch({ effects: setErrorHighlight.of({ line, column }) });
  }

  /** Clears any active error highlight without changing the content. */
  clearErrorHighlight(): void {
    this.view.dispatch({ effects: setErrorHighlight.of(null) });
  }

  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  focus(): void {
    this.view.focus();
  }
}
