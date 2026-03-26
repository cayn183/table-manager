import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  readOnly?: boolean
  placeholder?: string
  style?: React.CSSProperties
}

const BTN_BASE: React.CSSProperties = {
  padding: '3px 7px',
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  background: 'white',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  color: '#1e293b',
  lineHeight: 1.4,
  transition: 'background 0.1s',
}

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN_BASE,
  background: '#667eea',
  color: 'white',
  borderColor: '#667eea',
}

const DIVIDER: React.CSSProperties = {
  width: 1,
  background: '#e2e8f0',
  margin: '0 4px',
  alignSelf: 'stretch',
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={active ? BTN_ACTIVE : { ...BTN_BASE, opacity: disabled ? 0.4 : 1 }}
      title={title}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  )
}

export default function TiptapEditor({ value, onChange, readOnly, placeholder, style }: TiptapEditorProps) {
  const lastEmittedRef = useRef(value)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    ],
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      lastEmittedRef.current = html
      onChange(html)
    },
  })

  // Sync external value changes (e.g., loading a saved template)
  useEffect(() => {
    if (editor && value !== lastEmittedRef.current) {
      editor.commands.setContent(value)
      lastEmittedRef.current = value
    }
  }, [value, editor])

  // Sync readOnly changes
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly)
  }, [readOnly, editor])

  const openLinkDialog = useCallback(() => {
    if (!editor) return
    const existing = editor.getAttributes('link').href ?? ''
    setLinkUrl(existing)
    setLinkDialogOpen(true)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setLinkDialogOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  if (!editor) return null

  const isDisabled = readOnly

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', background: 'white', ...style }}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 3,
          padding: '6px 8px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          {/* Headings */}
          <ToolbarButton
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Überschrift 1"
            disabled={isDisabled}
          >H1</ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Überschrift 2"
            disabled={isDisabled}
          >H2</ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Überschrift 3"
            disabled={isDisabled}
          >H3</ToolbarButton>
          <ToolbarButton
            active={!editor.isActive('heading')}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Normaler Text"
            disabled={isDisabled}
          >P</ToolbarButton>

          <div style={DIVIDER} />

          {/* Formatting */}
          <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Fett (Ctrl+B)" disabled={isDisabled}>
            <b>B</b>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv (Ctrl+I)" disabled={isDisabled}>
            <i>I</i>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Unterstrichen (Ctrl+U)" disabled={isDisabled}>
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Durchgestrichen" disabled={isDisabled}>
            <s>S</s>
          </ToolbarButton>

          <div style={DIVIDER} />

          {/* Text color */}
          <label title="Textfarbe" style={{ ...BTN_BASE, padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 11 }}>A</span>
            <input
              type="color"
              defaultValue="#000000"
              style={{ width: 16, height: 16, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 2 }}
              onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
            />
          </label>

          {/* Background/Highlight color */}
          <label title="Hintergrundfarbe" style={{ ...BTN_BASE, padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 11 }}>BG</span>
            <input
              type="color"
              defaultValue="#ffff00"
              style={{ width: 16, height: 16, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 2 }}
              onInput={(e) => editor.chain().focus().setHighlight({ color: (e.target as HTMLInputElement).value }).run()}
            />
          </label>

          <div style={DIVIDER} />

          {/* Alignment */}
          <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Linksbündig" disabled={isDisabled}>⬅</ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Zentriert" disabled={isDisabled}>↔</ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Rechtsbündig" disabled={isDisabled}>➡</ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Blocksatz" disabled={isDisabled}>≡</ToolbarButton>

          <div style={DIVIDER} />

          {/* Lists */}
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummerierte Liste" disabled={isDisabled}>1.</ToolbarButton>
          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Aufzählung" disabled={isDisabled}>•</ToolbarButton>

          <div style={DIVIDER} />

          {/* Blockquote */}
          <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Zitat" disabled={isDisabled}>"</ToolbarButton>

          {/* Link */}
          <ToolbarButton active={editor.isActive('link')} onClick={openLinkDialog} title="Link einfügen" disabled={isDisabled}>🔗</ToolbarButton>

          <div style={DIVIDER} />

          {/* Clear formatting */}
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="Formatierung entfernen"
            disabled={isDisabled}
          >✕</ToolbarButton>
        </div>
      )}

      {/* Link dialog */}
      {linkDialogOpen && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="url"
            autoFocus
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setLinkDialogOpen(false) }}
            placeholder="https://..."
            style={{ flex: 1, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
          />
          <button onMouseDown={applyLink} type="button" style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#667eea', color: 'white', cursor: 'pointer', fontSize: 13 }}>OK</button>
          <button onMouseDown={() => setLinkDialogOpen(false)} type="button" style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  )
}
