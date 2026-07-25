<script>
  import { onMount, onDestroy } from 'svelte';
  import { basicSetup } from 'codemirror';
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { json } from '@codemirror/lang-json';
  import { browser } from '$app/environment';

  let { value = '', onChange = () => {}, height = '160px' } = $props();

  let container = $state(null);
  let view;

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        json(),
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
  <div bind:this={container} class="border border-gray-200 rounded-lg overflow-hidden focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all" style="height: {height}">
  </div>
{/if}
