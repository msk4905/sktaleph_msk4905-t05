// position-control.js — 문구·이미지 위치를 캔버스에서 직접 드래그하거나 방향키로 조절

        // ---------- 위치 적용 ----------
        function clampPct(v) {
            return Math.min(100, Math.max(0, v));
        }

        function updateTextPosition() {
            previewText.style.left = textPosX + '%';
            previewText.style.top = textPosY + '%';
            previewText.style.transform = 'translate(-50%, -50%)';
        }

        function updateImagePosition() {
            canvasBg.style.backgroundPosition = imagePosX + '% ' + imagePosY + '%';
        }

        // 이미지가 담긴 박스(containerW x containerH)를 원본(natW x natH)이
        // "꽉 채우도록"(CSS cover와 동일한 알고리즘) 필요한 실제 픽셀 크기 계산
        function computeCoverSize(containerW, containerH, natW, natH) {
            const scale = Math.max(containerW / natW, containerH / natH);
            return { w: natW * scale, h: natH * scale };
        }

        // 확대는 transform이 아니라 실제 background-size(이미지 자체의 픽셀 크기)를 키우는 방식으로 처리한다.
        // transform으로 화면에 보이는 결과만 키우면 "잘려서 안 보이던 부분"이 새로 생기지 않지만,
        // background-size를 키우면 캔버스보다 진짜로 더 큰 이미지가 되어 이동 가능한 여유가 실제로 늘어난다.
        function updateImageZoom() {
            canvasBg.style.transform = ''; // 이전 버전에서 쓰던 transform 방식 잔여값 제거
            if (!imageNaturalWidth || !imageNaturalHeight) {
                canvasBg.style.backgroundSize = 'cover';
                return;
            }
            const containerW = canvasBox.offsetWidth;
            const containerH = canvasBox.offsetHeight;
            const cover = computeCoverSize(containerW, containerH, imageNaturalWidth, imageNaturalHeight);
            const scale = imageZoom / 100;
            canvasBg.style.backgroundSize = (cover.w * scale) + 'px ' + (cover.h * scale) + 'px';
        }

        // 현재 화면비·확대 상태에서 실제로 이동 가능한 여유(px)를 계산
        function getImagePanRoom() {
            const containerW = canvasBox.offsetWidth;
            const containerH = canvasBox.offsetHeight;
            if (!imageNaturalWidth || !imageNaturalHeight) {
                return { excessW: 0, excessH: 0 };
            }
            const cover = computeCoverSize(containerW, containerH, imageNaturalWidth, imageNaturalHeight);
            const scale = imageZoom / 100;
            const bgW = cover.w * scale;
            const bgH = cover.h * scale;
            return {
                excessW: Math.max(0, bgW - containerW),
                excessH: Math.max(0, bgH - containerH)
            };
        }

        // 마우스/방향키로 이동한 실제 픽셀(dxPx, dyPx)을 현재 여유에 맞는 background-position %로 환산해 적용
        // ("사진을 손으로 끌어당기는" 감각: 오른쪽으로 끌면 사진이 오른쪽으로 따라오며 왼쪽이 드러남)
        function applyImagePan(dxPx, dyPx) {
            const { excessW, excessH } = getImagePanRoom();
            if (excessW > 0) {
                imagePosX = clampPct(imagePosX - (dxPx / excessW) * 100);
            }
            if (excessH > 0) {
                imagePosY = clampPct(imagePosY - (dyPx / excessH) * 100);
            }
            updateImagePosition();
        }

        // ---------- 선택 상태 표시 ----------
        function selectTarget(target) {
            selectedTarget = target;
            previewText.classList.toggle('selected', target === 'text');
            canvasBg.classList.toggle('selected', target === 'image');
        }

        previewText.addEventListener('focus', () => {
            pushUndoSnapshot();
            selectTarget('text');
        });
        previewText.addEventListener('blur', () => {
            previewText.classList.remove('selected');
            if (selectedTarget === 'text') selectedTarget = null;
        });

        let skipNextFocusSnapshot = false;

        canvasBg.addEventListener('focus', () => {
            if (!skipNextFocusSnapshot) pushUndoSnapshot();
            skipNextFocusSnapshot = false;
            selectTarget('image');
        });
        canvasBg.addEventListener('blur', () => {
            canvasBg.classList.remove('selected');
            if (selectedTarget === 'image') selectedTarget = null;
        });

        // ---------- 드래그 공용 로직 (원시 픽셀 이동량을 그대로 콜백에 전달) ----------
        function makeDraggable(el, onMove) {
            let dragging = false;
            let startX = 0, startY = 0;

            el.addEventListener('pointerdown', (e) => {
                if (e.button !== undefined && e.button !== 0) return; // 좌클릭(또는 터치)만 처리
                el.focus(); // focus 리스너에서 pushUndoSnapshot + 선택 표시 처리
                dragging = true;
                startX = e.clientX;
                startY = e.clientY;
                el.setPointerCapture(e.pointerId);
                e.preventDefault();
            });

            el.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                startX = e.clientX;
                startY = e.clientY;
                onMove(dx, dy);
            });

            el.addEventListener('pointerup', (e) => {
                dragging = false;
                try { el.releasePointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
            });
            el.addEventListener('pointercancel', () => { dragging = false; });
        }

        // 문구: 마우스가 움직인 방향으로 그대로 이동 (캔버스 크기 기준 %)
        makeDraggable(previewText, (dxPx, dyPx) => {
            const rect = canvasBox.getBoundingClientRect();
            textPosX = clampPct(textPosX + (dxPx / rect.width) * 100);
            textPosY = clampPct(textPosY + (dyPx / rect.height) * 100);
            updateTextPosition();
        });

        // 이미지: 실제 여유(줌으로 늘어난 크기 포함)를 기준으로 이동
        makeDraggable(canvasBg, (dxPx, dyPx) => {
            if (!currentImageSrc) return;
            applyImagePan(dxPx, dyPx);
        });

        // ---------- 방향키 미세조정 (1px, Shift+방향키 10px) ----------
        function handleArrowKey(e, target) {
            const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (!ARROW_KEYS.includes(e.key)) return;
            e.preventDefault();

            const stepPx = e.shiftKey ? 10 : 1;
            let dxPx = 0, dyPx = 0;
            if (e.key === 'ArrowLeft') dxPx = -stepPx;
            if (e.key === 'ArrowRight') dxPx = stepPx;
            if (e.key === 'ArrowUp') dyPx = -stepPx;
            if (e.key === 'ArrowDown') dyPx = stepPx;

            if (target === 'text') {
                const rect = canvasBox.getBoundingClientRect();
                textPosX = clampPct(textPosX + (dxPx / rect.width) * 100);
                textPosY = clampPct(textPosY + (dyPx / rect.height) * 100);
                updateTextPosition();
            } else if (target === 'image') {
                if (!currentImageSrc) return;
                applyImagePan(dxPx, dyPx);
            }
        }

        previewText.addEventListener('keydown', (e) => handleArrowKey(e, 'text'));
        canvasBg.addEventListener('keydown', (e) => handleArrowKey(e, 'image'));

        // ---------- 이미지 확대/축소 (마우스 휠) ----------
        const ZOOM_MIN = 100;
        const ZOOM_MAX = 300;

        function clampZoom(v) {
            return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));
        }

        let zoomSessionActive = false;
        let zoomSessionTimer = null;

        canvasBox.addEventListener('wheel', (e) => {
            if (!currentImageSrc) return; // 불러온 이미지가 없으면 무시
            e.preventDefault();

            if (!zoomSessionActive) {
                pushUndoSnapshot();
                zoomSessionActive = true;
                skipNextFocusSnapshot = true; // 아래 focus()로 인한 중복 스냅샷 방지
                canvasBg.focus({ preventScroll: true });
            }
            clearTimeout(zoomSessionTimer);
            zoomSessionTimer = setTimeout(() => { zoomSessionActive = false; }, 600);

            // 위로 스크롤(deltaY 음수) = 확대, 아래로 스크롤 = 축소
            const delta = -e.deltaY * 0.15;
            imageZoom = clampZoom(imageZoom + delta);
            updateImageZoom();
        }, { passive: false });
