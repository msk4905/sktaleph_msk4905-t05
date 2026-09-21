// canvas-export.js — 캔버스 렌더링, 다운로드/클립보드 복사, 다운로드 히스토리

        // ---------- 다운로드 / 복사 / 다운로드 히스토리 ----------
        async function processCanvasRendering() {
            // 구글 폰트가 아직 로딩 중이면 캡처 결과의 글꼴이 화면과 달라질 수 있어,
            // 폰트 로딩이 끝난 뒤에 캡처한다.
            if (document.fonts && document.fonts.ready) {
                try { await document.fonts.ready; } catch (e) { /* 무시하고 진행 */ }
            }
            const canvas = await html2canvas(canvasBox, {
                scale: 3,
                useCORS: true,
                backgroundColor: null,
                logging: false
            });
            return canvas;
        }

        function renderHistory() {
            historyRow.innerHTML = '';
            if (DOWNLOAD_HISTORY.length === 0) {
                historyRow.innerHTML = '<span class="history-empty">다운로드하면 여기 표시됩니다</span>';
                return;
            }
            DOWNLOAD_HISTORY.forEach((url, i) => {
                const div = document.createElement('div');
                div.className = 'history-thumb';
                div.style.backgroundImage = `url("${url}")`;
                div.title = '클릭하면 다시 다운로드';
                div.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.download = `meme_card_studio_result_${i + 1}.png`;
                    a.href = url;
                    a.click();
                });
                historyRow.appendChild(div);
            });
        }

        function pushDownloadHistory(dataUrl) {
            DOWNLOAD_HISTORY.unshift(dataUrl);
            if (DOWNLOAD_HISTORY.length > HISTORY_MAX) DOWNLOAD_HISTORY.length = HISTORY_MAX;
            renderHistory();
        }

        async function doDownload() {
            const canvas = await processCanvasRendering();
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'meme_card_studio_result.png';
            link.href = dataUrl;
            link.click();
            pushDownloadHistory(dataUrl);
            showError('이미지가 다운로드되었습니다!');
        }
        downloadBtn.addEventListener('click', doDownload);

        copyBtn.addEventListener('click', async () => {
            try {
                const canvas = await processCanvasRendering();
                canvas.toBlob(blob => {
                    if (blob) {
                        const clipboardItem = new ClipboardItem({ 'image/png': blob });
                        navigator.clipboard.write([clipboardItem]).then(() => {
                            showError('클립보드에 이미지가 복사되었습니다! (Ctrl+V 가능)');
                        }).catch(err => {
                            console.error(err);
                            showError('클립보드 복사 권한이 거부되었거나 지원하지 않는 환경입니다.');
                        });
                    } else {
                        showError('이미지 변환 실패');
                    }
                }, 'image/png');
            } catch (e) {
                console.error(e);
                showError('현재 브라우저 환경에서 클립보드를 지원하지 않습니다.');
            }
        });
