// editor-state.js — 편집 상태 캡처/적용, 되돌리기, 정렬·화면비·글꼴·색상·이미지 업로드·초기화 컨트롤

        // ---------- 상태 캡처 / 적용 (되돌리기·템플릿 로드·초기화가 공유) ----------
        function captureState() {
            return {
                text: textContent.value,
                fontSize: fontSize.value,
                fontColor: paletteInput.value,
                textPosX: textPosX,
                textPosY: textPosY,
                imagePosX: imagePosX,
                imagePosY: imagePosY,
                imageZoom: imageZoom,
                align: currentAlign,
                aspect: currentAspect,
                image: currentImageSrc,
                dimmer: dimmerRange.value,
                watermark: watermarkInput.value,
                font: currentFont,
                bold: currentBold
            };
        }

        function pushUndoSnapshot() {
            UNDO_STACK.push(captureState());
            if (UNDO_STACK.length > UNDO_MAX) UNDO_STACK.shift();
        }

        function applyAspectSize(ratio) {
            aspectBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-ratio') === ratio));
            if (ratio === '1:1') {
                canvasBox.style.width = '300px';
                canvasBox.style.height = '300px';
            } else if (ratio === '4:5') {
                canvasBox.style.width = '240px';
                canvasBox.style.height = '300px';
            } else if (ratio === '9:16') {
                canvasBox.style.width = '168.75px';
                canvasBox.style.height = '300px';
            }
            // 캔버스 크기가 바뀌면 "꽉 채우는" 기준 크기도 달라지므로 확대 크기를 다시 계산해야 한다.
            updateImageZoom();
        }

        function updateAlignmentStyle() {
            previewText.style.textAlign = currentAlign;
        }

        function updateSwatchActiveState() {
            const val = (paletteInput.value || '').toLowerCase();
            swatches.forEach(s => s.classList.toggle('active', s.getAttribute('data-color') === val));
        }

        function applyFontStyle() {
            previewText.style.fontFamily = FONT_MAP[currentFont] || FONT_MAP.impact;
            previewText.style.fontWeight = currentBold ? '800' : '400';
            fontBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-font') === currentFont));
            boldToggle.classList.toggle('active', currentBold);
        }

        // 이미지 원본 크기를 비동기로 확인한 뒤 확대 크기를 계산 (템플릿에 저장된 이미지 등,
        // 이미 디코딩 검증이 끝난 데이터에도 원본 크기(natural size) 정보가 새로 필요하기 때문)
        function syncImageNaturalSize(src) {
            if (!src) {
                imageNaturalWidth = 0;
                imageNaturalHeight = 0;
                updateImageZoom();
                return;
            }
            const img = new Image();
            img.onload = () => {
                imageNaturalWidth = img.naturalWidth;
                imageNaturalHeight = img.naturalHeight;
                updateImageZoom();
            };
            img.onerror = () => {
                imageNaturalWidth = 0;
                imageNaturalHeight = 0;
                updateImageZoom();
            };
            img.src = src;
        }

        function applyState(s) {
            textContent.value = s.text ?? '';
            previewText.textContent = textContent.value;

            fontSize.value = s.fontSize ?? 24;
            fontSizeNum.value = fontSize.value;
            previewText.style.fontSize = fontSize.value + 'px';

            paletteInput.value = s.fontColor ?? '#ffffff';
            previewText.style.color = paletteInput.value;
            updateSwatchActiveState();

            // 문구 위치: 신규 필드(textPosX/Y) 우선, 없으면 예전 템플릿의 posY(세로%만 있던 버전) 호환 처리
            textPosX = s.textPosX ?? 50;
            textPosY = s.textPosY ?? (s.posY ?? 50);
            updateTextPosition();

            currentAlign = s.align || 'center';
            updateAlignmentStyle();

            currentAspect = s.aspect || '1:1';
            applyAspectSize(currentAspect);

            currentImageSrc = s.image || '';
            canvasBg.style.backgroundImage = currentImageSrc ? `url("${currentImageSrc}")` : '';
            imageInput.value = '';

            // 이미지 위치: 없던 필드이므로 예전 템플릿엔 기본값(중앙 50/50)으로 폴백
            imagePosX = s.imagePosX ?? 50;
            imagePosY = s.imagePosY ?? 50;
            imageZoom = s.imageZoom ?? 100;
            updateImagePosition();
            syncImageNaturalSize(currentImageSrc); // 내부에서 updateImageZoom()까지 처리

            dimmerRange.value = s.dimmer ?? 0;
            dimmerNum.value = dimmerRange.value;
            canvasDimmer.style.backgroundColor = `rgba(0, 0, 0, ${dimmerRange.value / 100})`;

            watermarkInput.value = s.watermark || '';
            previewWatermark.textContent = watermarkInput.value;

            currentFont = s.font || 'impact';
            currentBold = s.bold !== undefined ? s.bold : false;
            applyFontStyle();
        }

        function performUndo() {
            if (UNDO_STACK.length === 0) {
                showError('되돌릴 내용이 없습니다.');
                return;
            }
            const snap = UNDO_STACK.pop();
            applyState(snap);
            showError('되돌렸습니다.');
        }
        undoBtn.addEventListener('click', performUndo);

        // ---------- 화면비 / 정렬 ----------
        aspectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                pushUndoSnapshot();
                currentAspect = btn.getAttribute('data-ratio');
                applyAspectSize(currentAspect);
            });
        });

        alignBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                pushUndoSnapshot();
                alignBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentAlign = btn.getAttribute('data-align');
                updateAlignmentStyle();
            });
        });

        // ---------- 글꼴 / 굵게 ----------
        fontBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                pushUndoSnapshot();
                currentFont = btn.getAttribute('data-font');
                applyFontStyle();
            });
        });
        boldToggle.addEventListener('click', () => {
            pushUndoSnapshot();
            currentBold = !currentBold;
            applyFontStyle();
        });

        // ---------- 색상 (스와치 + 전체 팔레트) ----------
        swatches.forEach(btn => {
            btn.addEventListener('click', () => {
                pushUndoSnapshot();
                paletteInput.value = btn.getAttribute('data-color');
                previewText.style.color = paletteInput.value;
                updateSwatchActiveState();
            });
        });
        paletteInput.addEventListener('focus', () => { pushUndoSnapshot(); });
        paletteInput.addEventListener('input', () => {
            previewText.style.color = paletteInput.value;
            updateSwatchActiveState();
        });

        // ---------- 파일 업로드 (실제 디코딩 검증) ----------
        function setFileStatus(msg, isError) {
            fileStatus.textContent = msg;
            fileStatus.className = 'file-status' + (isError ? ' file-status-error' : (msg ? ' file-status-ok' : ''));
        }

        function rejectImageFile(name, reason) {
            imageInput.value = '';
            setFileStatus(`❌ ${name}: ${reason} (기존 이미지는 유지됩니다)`, true);
            showError(`파일을 불러올 수 없습니다: ${reason}`);
        }

        function handleImageFile(file) {
            if (!file) return;

            if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
                rejectImageFile(file.name || '파일', 'PNG, JPEG 형식이 아닙니다');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                // 확장자/MIME만으로는 위장 파일(예: txt를 png로 이름만 변경)을 걸러낼 수 없으므로,
                // 실제로 이미지로 디코딩되는지 확인한 뒤에만 기존 이미지를 교체한다.
                const testImg = new Image();
                testImg.onload = () => {
                    pushUndoSnapshot();
                    currentImageSrc = event.target.result;
                    canvasBg.style.backgroundImage = `url("${currentImageSrc}")`;
                    imageNaturalWidth = testImg.naturalWidth;
                    imageNaturalHeight = testImg.naturalHeight;
                    // 새 이미지를 불러오면 이전 이미지의 크롭 위치를 그대로 물려받지 않고 중앙으로 초기화
                    imagePosX = 50;
                    imagePosY = 50;
                    imageZoom = 100;
                    updateImagePosition();
                    updateImageZoom();
                    setFileStatus(`✅ ${file.name || '이미지'} 불러옴`, false);
                };
                testImg.onerror = () => {
                    rejectImageFile(file.name || '파일', '이미지 데이터를 해석할 수 없습니다');
                };
                testImg.src = event.target.result;
            };
            reader.onerror = () => {
                rejectImageFile(file.name || '파일', '파일을 읽는 중 오류가 발생했습니다');
            };
            reader.readAsDataURL(file);
        }

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            handleImageFile(file);
        });

        // 슬라이더 ↔ 숫자 직접입력 양방향 동기화 (슬라이드가 힘들 때 숫자로 바로 입력 가능)
        function wireSlider(rangeEl, numEl, apply) {
            function setVal(v) {
                v = Math.min(Number(rangeEl.max), Math.max(Number(rangeEl.min), Math.round(Number(v) || 0)));
                rangeEl.value = v;
                numEl.value = v;
                apply(v);
            }
            rangeEl.addEventListener('pointerdown', () => pushUndoSnapshot());
            rangeEl.addEventListener('input', () => setVal(rangeEl.value));

            numEl.addEventListener('focus', () => pushUndoSnapshot());
            numEl.addEventListener('input', () => {
                if (numEl.value === '') return; // 지우는 중엔 그대로 두고 blur에서 보정
                setVal(numEl.value);
            });
            numEl.addEventListener('blur', () => setVal(numEl.value === '' ? rangeEl.value : numEl.value));
        }

        textContent.addEventListener('focus', () => { pushUndoSnapshot(); });
        textContent.addEventListener('input', () => { previewText.textContent = textContent.value; });

        wireSlider(fontSize, fontSizeNum, (v) => {
            previewText.style.fontSize = v + 'px';
        });

        wireSlider(dimmerRange, dimmerNum, (v) => {
            canvasDimmer.style.backgroundColor = `rgba(0, 0, 0, ${v / 100})`;
        });

        watermarkInput.addEventListener('focus', () => { pushUndoSnapshot(); });
        watermarkInput.addEventListener('input', () => {
            previewWatermark.textContent = watermarkInput.value;
        });

        // ---------- 초기화 ----------
        resetBtn.addEventListener('click', () => {
            if (confirm('정말 모든 편집 내용을 초기화하시겠습니까?')) {
                pushUndoSnapshot();
                applyState({
                    text: '안녕하세요! 짤·카드 스튜디오입니다 ✨',
                    fontSize: 24,
                    fontColor: '#ffffff',
                    textPosX: 50,
                    textPosY: 50,
                    imagePosX: 50,
                    imagePosY: 50,
                    imageZoom: 100,
                    align: 'center',
                    aspect: '1:1',
                    image: '',
                    dimmer: 0,
                    watermark: '',
                    font: 'impact',
                    bold: false
                });
                templateName.value = '기본 템플릿';
                setFileStatus('', false);
                showError('모든 설정이 초기화되었습니다.');
            }
        });
