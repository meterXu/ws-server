<script>
  import { onMount, onDestroy } from 'svelte';
  import { basicSetup } from 'codemirror';
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { json } from '@codemirror/lang-json';
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { tags } from '@lezer/highlight';
  import { browser } from '$app/environment';

  let { value = '', onChange = () => {}, height = '160px' } = $props();

  let container = $state(null);
  let view;

  // Purple glass dark theme
  const purpleTheme = EditorView.theme({
    '&': {
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      color: '#e2e8f0',
      borderRadius: '0.75rem',
    },
    '.cm-content': {
      caretColor: '#a855f7',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      fontSize: '13px',
      lineHeight: '1.6',
      padding: '4px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#a855f7',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(168, 85, 247, 0.25)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(168, 85, 247, 0.06)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      color: '#475569',
      border: 'none',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(168, 85, 247, 0.08)',
      color: '#94a3b8',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      color: '#a855f7',
      border: '1px solid rgba(168, 85, 247, 0.2)',
      borderRadius: '4px',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(168, 85, 247, 0.2)',
      outline: '1px solid rgba(168, 85, 247, 0.3)',
      color: '#c084fc',
    },
    '.cm-nonmatchingBracket': {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      outline: '1px solid rgba(239, 68, 68, 0.3)',
    },
    '.cm-tooltip': {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      color: '#e2e8f0',
      backdropFilter: 'blur(16px)',
    },
    '.cm-tooltip-autocomplete': {
      '& .cm-completionIcon': {
        color: '#a855f7',
      },
      '& .cm-completionMatchedText': {
        color: '#c084fc',
        textDecoration: 'none',
        fontWeight: '600',
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        color: '#f8fafc',
      },
    },
  }, { dark: true });

  // Purple syntax highlighting
  const purpleHighlight = HighlightStyle.define([
    { tag: tags.keyword, color: '#c084fc', fontWeight: '600' },
    { tag: tags.string, color: '#a5b4fc' },
    { tag: tags.number, color: '#f0abfc' },
    { tag: tags.bool, color: '#c084fc' },
    { tag: tags.null, color: '#94a3b8' },
    { tag: tags.propertyName, color: '#94a3b8' },
    { tag: tags.bracket, color: '#64748b' },
    { tag: tags.brace, color: '#64748b' },
    { tag: tags.paren, color: '#64748b' },
    { tag: tags.separator, color: '#64748b' },
    { tag: tags.operator, color: '#a855f7' },
    { tag: tags.comment, color: '#475569', fontStyle: 'italic' },
    { tag: tags.lineComment, color: '#475569', fontStyle: 'italic' },
    { tag: tags.heading, color: '#c084fc', fontWeight: '700' },
    { tag: tags.strong, fontWeight: '700', color: '#e2e8f0' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#cbd5e1' },
    { tag: tags.link, color: '#818cf8', textDecoration: 'underline' },
    { tag: tags.meta, color: '#94a3b8' },
    { tag: tags.name, color: '#e2e8f0' },
    { tag: tags.typeName, color: '#f0abfc' },
    { tag: tags.labelName, color: '#a5b4fc' },
    { tag: tags.color, color: '#f0abfc' },
    { tag: tags.regexp, color: '#f0abfc' },
    { tag: tags.escape, color: '#c084fc' },
    { tag: tags.url, color: '#818cf8' },
    { tag: tags.deleted, color: '#ef4444' },
    { tag: tags.inserted, color: '#a855f7' },
    { tag: tags.changed, color: '#f59e0b' },
  ]);

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        json(),
        purpleTheme,
        syntaxHighlighting(purpleHighlight),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            value = update.state.doc.toString();
            onChange(value);
          }
        })
      ]
    });

    view = new EditorView({
      state,
      parent: container
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });

  export function setValue(newValue) {
    if (!view) return;
    const current = view.state.doc.toString();
    if (newValue !== current) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newValue }
      });
    }
  }

  export function getValue() {
    return view ? view.state.doc.toString() : value;
  }
</script>

{#if browser}
  <div
    bind:this={container}
    class="glass-subtle rounded-xl overflow-hidden glow-ring"
    style="height: {height}"
  ></div>
{/if}
