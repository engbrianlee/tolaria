import {
  Decoration, EditorView, WidgetType,
  type DecorationSet,
} from '@codemirror/view'
import { StateField, type Extension } from '@codemirror/state'

/**
 * Hides YAML frontmatter (--- ... ---) from the editor view.
 * Reveals it when cursor is within the frontmatter block.
 *
 * Uses StateField (not ViewPlugin) because the replacement spans line breaks,
 * which CM6 only allows via atomic ranges from state fields.
 */

/** Find the frontmatter range: returns [from, to] or null */
export function findFrontmatter(doc: string): [number, number] | null {
  if (!doc.startsWith('---')) return null
  // Find the closing ---
  const end = doc.indexOf('\n---', 3)
  if (end === -1) return null
  // Include the closing --- and its trailing newline
  let to = end + 4 // past "\n---"
  if (doc[to] === '\n') to++ // include trailing newline after closing ---
  return [0, to]
}

class FrontmatterWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-frontmatter-collapsed'
    span.textContent = '---'
    return span
  }
}

function buildDecorations(docStr: string, selectionHead: number): DecorationSet {
  const range = findFrontmatter(docStr)
  if (!range) return Decoration.none

  const [from, to] = range

  // If cursor is within frontmatter, show it all
  if (selectionHead >= from && selectionHead < to) {
    return Decoration.none
  }

  // Replace entire frontmatter block with collapsed indicator
  return Decoration.set([
    Decoration.replace({ widget: new FrontmatterWidget(), block: true }).range(from, to),
  ])
}

const frontmatterField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state.doc.toString(), state.selection.main.head)
  },
  update(decs, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state.doc.toString(), tr.state.selection.main.head)
    }
    return decs
  },
  provide: (f) => EditorView.decorations.from(f),
})

const frontmatterTheme = EditorView.theme({
  '.cm-frontmatter-collapsed': {
    display: 'block',
    color: '#555',
    fontSize: '12px',
    padding: '2px 0',
    cursor: 'pointer',
    userSelect: 'none',
  },
})

export function frontmatterHide(): Extension {
  return [frontmatterField, frontmatterTheme]
}
