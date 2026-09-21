// shortcuts.js — 키보드 단축키 (Ctrl+Enter / Ctrl+S / Ctrl+Z) 및 클립보드 붙여넣기(Ctrl+V)

        // 텍스트 입력이 수행되는 요소를 구분하기 위한 헬퍼 함수
        function isTextInputElement(el) {
            if (!el) return false;
            const tag = el.tagName;
            if (tag === 'TEXTAREA') return true;
            if (el.isContentEditable) return true;
            if (tag === 'INPUT') {
                const type = (el.type || 'text').toLowerCase();
                const textInputTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
                return textInputTypes.includes(type);
            }
            return false;
        }

        // ---------- 키보드 단축키 및 이벤트 ----------
        document.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            const isEditable = isTextInputElement(document.activeElement);

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

        // ---------- 클립보드 붙여넣기 (경로 1: Ctrl+V) ----------
        document.addEventListener('paste', (e) => {
            const isEditable = isTextInputElement(document.activeElement);

            if (isEditable) {
                return; // 텍스트 입력 요소 편집 중에는 기본 텍스트 붙여넣기 동작 유지
            }

            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData || !clipboardData.files) return;

            const files = Array.from(clipboardData.files);
            const imageFile = files.find(file => file.type.startsWith('image/'));

            if (imageFile) {
                e.preventDefault();
                handleImageFile(imageFile);
            }
        });
