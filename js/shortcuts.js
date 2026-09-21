// shortcuts.js — 키보드 단축키 (Ctrl+Enter / Ctrl+S / Ctrl+Z)

        // ---------- 키보드 단축키 ----------
        document.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            const tag = document.activeElement ? document.activeElement.tagName : '';
            const isEditable = tag === 'INPUT' || tag === 'TEXTAREA';

            if (e.key === 'Enter') {
                e.preventDefault();
                doDownload();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                doSaveTemplate();
            } else if ((e.key === 'z' || e.key === 'Z') && !isEditable) {
                e.preventDefault();
                performUndo();
            }
        });
