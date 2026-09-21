// templates.js — 템플릿 CRUD(id 기반), 검색/정렬, JSON 가져오기·내보내기

        // ---------- 이미지 압축 (localStorage 용량 대비) ----------
        function compressImage(src, maxWidth = 600, quality = 0.7) {
            return new Promise((resolve) => {
                if (!src) return resolve('');
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => resolve(src);
            });
        }

        // ---------- 템플릿 CRUD (id 기반) ----------
        function genTemplateId() {
            return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
        }

        function getTemplates() {
            const list = JSON.parse(localStorage.getItem('studio_templates') || '[]');
            // 이전 데이터나 JSON 가져오기로 id/updatedAt이 없는 항목은 보정해 부여한다.
            // (배열 위치는 삭제/재정렬 시 바뀔 수 있어 식별자로 쓰지 않는다.)
            let needsBackfill = false;
            list.forEach(t => {
                if (!t.id) { t.id = genTemplateId(); needsBackfill = true; }
                if (!t.updatedAt) { t.updatedAt = Date.now(); needsBackfill = true; }
            });
            if (needsBackfill) {
                localStorage.setItem('studio_templates', JSON.stringify(list));
            }
            return list;
        }

        function saveTemplates(templates) {
            try {
                localStorage.setItem('studio_templates', JSON.stringify(templates));
                renderTemplates();
            } catch (e) {
                showError('저장 공간(LocalStorage)이 부족합니다. 이미지를 변경하거나 기존 템플릿을 삭제해주세요.');
            }
        }

        function renderTemplates() {
            let templates = getTemplates();

            if (currentSearch) {
                templates = templates.filter(t => t.name.toLowerCase().includes(currentSearch));
            }
            templates = templates.slice().sort((a, b) => {
                if (currentSort === 'name') return a.name.localeCompare(b.name, 'ko');
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            });

            templateList.innerHTML = '';
            if (templates.length === 0) {
                templateList.innerHTML = `<span style="font-size:0.8rem; color:var(--text-sub); padding:0.25rem 0;">${currentSearch ? '검색 결과가 없습니다.' : '저장된 템플릿이 없습니다.'}</span>`;
                return;
            }
            templates.forEach((t) => {
                const div = document.createElement('div');
                div.className = 'item-card';
                div.innerHTML = `
                    <span title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
                    <div class="item-actions">
                        <button class="link-btn load" onclick="loadTemplate('${t.id}')">불러오기</button>
                        <button class="link-btn delete" onclick="deleteTemplate('${t.id}')">삭제</button>
                    </div>
                `;
                templateList.appendChild(div);
            });
        }

        templateSearch.addEventListener('input', () => {
            currentSearch = templateSearch.value.trim().toLowerCase();
            renderTemplates();
        });
        sortRecentBtn.addEventListener('click', () => {
            currentSort = 'recent';
            sortRecentBtn.classList.add('active');
            sortNameBtn.classList.remove('active');
            renderTemplates();
        });
        sortNameBtn.addEventListener('click', () => {
            currentSort = 'name';
            sortNameBtn.classList.add('active');
            sortRecentBtn.classList.remove('active');
            renderTemplates();
        });

        async function doSaveTemplate() {
            const name = templateName.value.trim();
            if (!name) {
                showError('템플릿 이름을 입력해주세요.');
                return;
            }

            showError('템플릿 저장 중...');
            const compressedImage = await compressImage(currentImageSrc);

            const templates = getTemplates();
            const existingIndex = templates.findIndex(t => t.name === name);

            const newItem = {
                id: existingIndex !== -1 ? templates[existingIndex].id : genTemplateId(),
                name,
                text: textContent.value,
                fontSize: fontSize.value,
                fontColor: paletteInput.value,
                textPosX: textPosX,
                textPosY: textPosY,
                imagePosX: imagePosX,
                imagePosY: imagePosY,
                imageZoom: imageZoom,
                aspect: currentAspect,
                image: compressedImage,
                align: currentAlign,
                dimmer: dimmerRange.value,
                watermark: watermarkInput.value,
                font: currentFont,
                bold: currentBold,
                updatedAt: Date.now()
            };

            if (existingIndex !== -1) {
                templates[existingIndex] = newItem;
                showError(`'${name}' 템플릿이 수정(덮어쓰기)되었습니다.`);
            } else {
                templates.push(newItem);
                showError('템플릿이 신규 저장되었습니다.');
            }
            saveTemplates(templates);
        }
        saveTemplateBtn.addEventListener('click', doSaveTemplate);

        window.loadTemplate = function(id) {
            const templates = getTemplates();
            const t = templates.find(x => x.id === id);
            if (!t) return;

            pushUndoSnapshot();
            templateName.value = t.name;
            applyState(t);
            showError('템플릿을 불러왔습니다.');
        };

        window.deleteTemplate = function(id) {
            let templates = getTemplates();
            templates = templates.filter(x => x.id !== id);
            saveTemplates(templates);
            showError('템플릿이 삭제되었습니다.');
        };

        exportJsonBtn.addEventListener('click', () => {
            const templates = getTemplates();
            const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = url;
            downloadAnchor.download = "meme_studio_templates.json";
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            URL.revokeObjectURL(url);
        });

        importJsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (!Array.isArray(parsed)) throw new Error('올바른 배열 형식이 아닙니다.');
                    if (parsed.length === 0) {
                        throw new Error('빈 목록으로는 가져올 수 없습니다.');
                    }
                    for (let item of parsed) {
                        if (!item.name || item.text === undefined) throw new Error('필수 항목이 누락되었습니다.');
                    }
                    saveTemplates(parsed);
                    showError('JSON이 성공적으로 복원되었습니다.');
                } catch (err) {
                    showError('오류: ' + err.message + ' (기존 상태 유지됨)');
                }
                importJsonInput.value = '';
            };
            reader.readAsText(file);
        });
