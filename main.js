'use strict';

const obsidian = require('obsidian');
const { Platform } = obsidian;
const { ViewPlugin } = require('@codemirror/view');

const fatCursorViewPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.cursor = document.createElement('div');
      this.cursor.className = 'ia-writer-cursor';
      this.cursor.style.display = 'none';

      this.container = view.scrollDOM;
      this.container.appendChild(this.cursor);

      this.onScroll = () => this.schedule();
      view.scrollDOM.addEventListener('scroll', this.onScroll, { passive: true });

      this.reinsertInterval = setInterval(() => {
        if (!this.cursor.isConnected) {
          this.container.appendChild(this.cursor);
          this.schedule();
        }
      }, 500);

      this.schedule();
    }

    schedule() {
      this.view.requestMeasure({
        read: () => this.render(),
        write: () => {}
      });
    }

    update(update) {
      if (
        update.selectionSet ||
        update.docChanged ||
        update.geometryChanged ||
        update.viewportChanged ||
        update.focusChanged
      ) {
        this.schedule();
      }
    }

    render() {
      const view = this.view;
      const sel = view.state.selection.main;

      if (!sel.empty) {
        this.cursor.style.display = 'none';
        return;
      }

      let coords;
      try {
        coords = view.coordsAtPos(sel.head);
      } catch (e) {
        this.cursor.style.display = 'none';
        return;
      }
      if (!coords) {
        this.cursor.style.display = 'none';
        return;
      }

      const containerRect = this.container.getBoundingClientRect();
      const left = coords.left - containerRect.left + this.container.scrollLeft;
      const baseTop = coords.top - containerRect.top + this.container.scrollTop;
      const baseHeight = coords.bottom - coords.top;

      const extra = Math.round(baseHeight * 0.25);
      const top = baseTop - Math.round(extra / 2);
      const height = baseHeight + extra;

      this.cursor.style.display = 'block';
      this.cursor.style.left = left + 'px';
      this.cursor.style.top = top + 'px';
      this.cursor.style.height = height + 'px';
    }

    destroy() {
      clearInterval(this.reinsertInterval);
      this.view.scrollDOM.removeEventListener('scroll', this.onScroll);
      this.cursor.remove();
    }
  }
);

class FatCursorPlugin extends obsidian.Plugin {
  async onload() {
    // Belt-and-suspenders mobile guard. The manifest already declares
    // isDesktopOnly: true, but in some installation paths (e.g. BRAT
    // sideloading on mobile) the manifest gate is bypassed and the
    // plugin loads anyway. Bail before installing the editor extension
    // so the fat caret never appears on mobile.
    if (Platform.isMobile) {
      console.log('iA Writer Cursor: mobile detected — plugin disabled');
      return;
    }
    this.registerEditorExtension(fatCursorViewPlugin);
    document.body.classList.add('ia-writer-cursor-active');
  }

  onunload() {
    document.body.classList.remove('ia-writer-cursor-active');
  }
}

module.exports = FatCursorPlugin;
