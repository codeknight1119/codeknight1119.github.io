  import { Editor, Node, mergeAttributes, nodeInputRule, InputRule } from 'https://esm.sh/@tiptap/core';
export const WikiLink = Node.create({
            name: 'wikiLink',
            group: 'inline',
            inline: true,
            selectable: true,
            // atom: true,

            addAttributes() {
                return {
                    slug: {
                        default: null,
                        // This parses the slug back out when loading saved HTML
                        parseHTML: element => element.getAttribute('data-slug'),
                        renderHTML: attributes => ({
                            'data-slug': attributes.slug,
                        }),
                    },
                }
            },

            parseHTML() {
                return [{ tag: 'a[data-slug]' }]
            },

            renderHTML({ node, HTMLAttributes }) {
                const slug = node.attrs.slug;
                // Basic encoding for the slug to safely pass into the string
                const encodedSlug = encodeURIComponent(slug);

                return [
                    'a',
                    {
                        ...HTMLAttributes,
                        class: 'clickable wiki-link',
                        //                        href: 'javascript:void(0)', // Cleaner than '#' for SPAs

                        onclick: `window.renderPage('${encodedSlug}'); return false;`,
                    },
                    slug,
                ]
            },

            addInputRules() {
                return [
                    new InputRule({
                        find: /\[\[(.+?)\]\]$/,
                        handler: ({ state, range, match }) => {
                            const { tr } = state;
                            const start = range.from;
                            const end = range.to;
                            const slug = match[1].trim();

                            if (slug) {
                                // This explicitly replaces the entire range (brackets included) 
                                // with your custom node
                                tr.replaceWith(
                                    start,
                                    end,
                                    this.type.create({ slug })
                                );
                            }
                        },
                    }),
                ]
            },
        })

// 1. The Parent Container Node
export const SortableList = Node.create({
  name: 'sortableList',
  group: 'block',
  content: 'sortableItem+', // Only allows SortableItems inside
  
  addAttributes() {
    return {
      isEditing: {
        default: true,
        parseHTML: element => element.getAttribute('data-editing') === 'true',
        renderHTML: attributes => ({ 'data-editing': attributes.isEditing }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sortable-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'sortable-list' }), 0];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('div');
      const isEditing = node.attrs.isEditing;
      container.className = `sortable-list-wrapper ${isEditing ? 'is-editing' : 'is-viewing'}`;
      
      // Control Panel (Toggle Button)
      const controls = document.createElement('div');
      controls.className = 'sortable-list-controls';
      controls.contentEditable = 'false'; // Keep UI interactive, outside Prosemirror typing
      
      const toggleBtn = document.createElement('button');
      toggleBtn.innerText = isEditing ? '👁️ View Mode' : '✏️ Edit / Sort';
      toggleBtn.type = 'button';
      
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof getPos === 'function') {
          // Update the node attribute directly in the editor state
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
              ...node.attrs,
              isEditing: !isEditing,
            })
          );
        }
      });
      
      controls.appendChild(toggleBtn);
      container.appendChild(controls);

      // Element where Tiptap drops the child nodes
      const contentDOM = document.createElement('div');
      contentDOM.className = 'sortable-list-content';
      
      container.appendChild(contentDOM);

      return {
        dom: container,
        contentDOM: contentDOM,
      };
    };
  },
  addInputRules() {
  return [

    nodeInputRule({
      find: /^===\s$/,
      type: this.type,
      getAttributes: () => ({ isEditing: true }),
    }),
  ]
},
});

// 2. The Individual List Item Node
export const SortableItem = Node.create({
  name: 'sortableItem',
  group: 'block',
  content: 'paragraph', // Restricts each item to a single paragraph. Change to 'block+' for rich text.
  defining: true,
  draggable: true, // Tells Tiptap this block can be dragged

  parseHTML() {
    return [{ tag: 'div[data-type="sortable-item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'sortable-item' }), 0];
  },

  addNodeView() {
    return () => {
      const dom = document.createElement('div');
      dom.className = 'sortable-item-wrapper';

      // Drag Handle
      const handle = document.createElement('div');
      handle.className = 'sortable-item-handle';
      handle.innerHTML = '☰'; 
      handle.setAttribute('data-drag-handle', 'true'); // Required: Tiptap automatically binds dragging to this element
      handle.contentEditable = 'false';

      // Content Box
      const contentDOM = document.createElement('div');
      contentDOM.className = 'sortable-item-content';

      dom.appendChild(handle);
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
      };
    };
  },
});