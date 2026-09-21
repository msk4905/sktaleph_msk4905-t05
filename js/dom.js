// dom.js — DOM 요소 참조, 전역 상태값, 공용 유틸(showError/escapeHtml)

        const imageInput = document.getElementById('imageInput');
        const dropzone = document.querySelector('.dropzone');
        const canvasBg = document.getElementById('canvasBg');
        const canvasDimmer = document.getElementById('canvasDimmer');
        const textContent = document.getElementById('textContent');
        const fontSize = document.getElementById('fontSize');
        const fontSizeNum = document.getElementById('fontSizeNum');
        const paletteInput = document.getElementById('paletteInput');
        const previewText = document.getElementById('previewText');
        const canvasBox = document.getElementById('canvasBox');
        const aspectBtns = document.querySelectorAll('.aspect-btn');
        const alignBtns = document.querySelectorAll('.seg-tabs .seg-btn[data-align]');
        const fontBtns = document.querySelectorAll('.font-tabs .seg-btn[data-font]');
        const boldToggle = document.getElementById('boldToggle');
        const swatches = document.querySelectorAll('.swatch');
        const dimmerRange = document.getElementById('dimmerRange');
        const dimmerNum = document.getElementById('dimmerNum');
        const watermarkInput = document.getElementById('watermarkInput');
        const previewWatermark = document.getElementById('previewWatermark');
        const templateName = document.getElementById('templateName');
        const saveTemplateBtn = document.getElementById('saveTemplateBtn');
        const templateList = document.getElementById('templateList');
        const templateSearch = document.getElementById('templateSearch');
        const sortRecentBtn = document.getElementById('sortRecentBtn');
        const sortNameBtn = document.getElementById('sortNameBtn');
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        const importJsonInput = document.getElementById('importJsonInput');
        const errorToast = document.getElementById('error-toast');
        const downloadBtn = document.getElementById('downloadBtn');
        const copyBtn = document.getElementById('copyBtn');
        const resetBtn = document.getElementById('resetBtn');
        const undoBtn = document.getElementById('undoBtn');
        const historyRow = document.getElementById('historyRow');
        const fileStatus = document.getElementById('fileStatus');

        const FONT_MAP = {
            impact: "'Black Han Sans', sans-serif",
            hand: "'Gaegu', sans-serif",
            gothic: "'Gothic A1', sans-serif"
        };

        let currentAspect = '1:1';
        let currentImageSrc = '';
        let currentAlign = 'center';
        let currentFont = 'impact';
        let currentBold = false;
        let currentSearch = '';
        let currentSort = 'recent';

        // 문구 위치 (캔버스 기준 %, 중심점) / 이미지 위치 (background-position %)
        let textPosX = 50;
        let textPosY = 50;
        let imagePosX = 50;
        let imagePosY = 50;
        let imageZoom = 100; // 100 = 원본 cover 크기, 최대 300
        let imageNaturalWidth = 0;
        let imageNaturalHeight = 0;

        // 캔버스 안에서 현재 선택된 대상: 'text' | 'image' | null
        let selectedTarget = null;

        const UNDO_STACK = [];
        const UNDO_MAX = 15;
        const DOWNLOAD_HISTORY = [];
        const HISTORY_MAX = 6;

        window.addEventListener('pageshow', () => {
            imageInput.value = '';
        });
        window.addEventListener('DOMContentLoaded', () => {
            imageInput.value = '';
            currentImageSrc = '';
            canvasBg.style.backgroundImage = '';
        });

        function showError(msg) {
            errorToast.textContent = msg;
            errorToast.style.display = 'block';
            setTimeout(() => { errorToast.style.display = 'none'; }, 3000);
        }

        function escapeHtml(str) {
            return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }
