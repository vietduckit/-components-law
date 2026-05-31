await ctx.importAsync('https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css');

const QuillModule = await ctx.importAsync('https://cdn.jsdelivr.net/npm/quill@2.0.3/+esm');
const Quill = QuillModule.default || QuillModule.Quill || QuillModule;

function JsRichTextField() {
  const React = ctx.React;
  const wrapperRef = React.useRef(null);
  const editorRef = React.useRef(null);
  const quillRef = React.useRef(null);
  const lastValueRef = React.useRef('');
  const isApplyingExternalRef = React.useRef(false);

  const props = ctx.model?.props || {};
  const disabled = !!(props.disabled || props.readOnly);

  const normalizeHtml = (html) => {
    const value = String(html ?? '').trim();
    return value === '<p><br></p>' ? '' : value;
  };

  const getEditorHtml = () => {
    const quill = quillRef.current;
    if (!quill) return '';
    return normalizeHtml(quill.root.innerHTML);
  };

  const prepareResizableLayout = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const toolbar = wrapper.querySelector('.ql-toolbar');
    const container = wrapper.querySelector('.ql-container');

    if (toolbar) {
      toolbar.style.flex = '0 0 auto';
    }

    if (container) {
      container.style.flex = '1 1 auto';
      container.style.minHeight = '0';
      container.style.height = 'auto';
      container.style.overflowY = 'auto';
    }
  };

  const applyHtmlToEditor = (html) => {
    const quill = quillRef.current;
    if (!quill) return;

    const nextValue = normalizeHtml(html);
    const currentValue = getEditorHtml();

    if (nextValue === currentValue) {
      lastValueRef.current = nextValue;
      return;
    }

    const range = quill.getSelection();

    isApplyingExternalRef.current = true;

    try {
      if (nextValue) {
        quill.clipboard.dangerouslyPasteHTML(nextValue, 'silent');
      } else {
        quill.setText('', 'silent');
      }

      lastValueRef.current = nextValue;

      if (range) {
        const length = quill.getLength();
        const index = Math.min(range.index, Math.max(length - 1, 0));
        quill.setSelection(index, range.length, 'silent');
      }
    } finally {
      isApplyingExternalRef.current = false;
    }
  };

  React.useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      readOnly: disabled,
      placeholder: props.placeholder || '',
      modules: {
        toolbar: disabled
          ? false
          : [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['blockquote', 'code-block'],
              ['link'],
              ['clean'],
            ],
      },
    });

    quillRef.current = quill;
    prepareResizableLayout();

    const initialValue = normalizeHtml(ctx.getValue?.() ?? '');
    applyHtmlToEditor(initialValue);
    lastValueRef.current = initialValue;

    const handleTextChange = () => {
      if (isApplyingExternalRef.current) return;

      const html = getEditorHtml();
      if (html === lastValueRef.current) return;

      lastValueRef.current = html;
      ctx.setValue?.(html);
    };

    quill.on('text-change', handleTextChange);

    return () => {
      quill.off('text-change', handleTextChange);
      quillRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    quillRef.current?.enable(!disabled);
  }, [disabled]);

  React.useEffect(() => {
    const handler = (ev) => {
      const nextValue = normalizeHtml(ev?.detail ?? '');

      if (nextValue === lastValueRef.current || nextValue === getEditorHtml()) {
        lastValueRef.current = nextValue;
        return;
      }

      applyHtmlToEditor(nextValue);
    };

    ctx.element?.addEventListener('js-field:value-change', handler);
    return () => ctx.element?.removeEventListener('js-field:value-change', handler);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={props.className}
      style={{
        ...props.style,
        height: props.style?.height || 200,
        minHeight: 200,
        maxHeight: 1000,
        resize: disabled ? 'none' : 'vertical',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        boxSizing: 'border-box',
      }}
    >
      <div ref={editorRef} />
    </div>
  );
}

ctx.render(<JsRichTextField />);