/**
 * Main Application Logic - Puzzle Generator
 */

class PuzzleApp {
    constructor() {
        this.generator = new PuzzleGenerator();
        this.currentPuzzle = null;
        this.currentImage = null;
        this.imageData = null;
        this.imageWidth = 0;
        this.imageHeight = 0;

        this.initializeElements();
        this.attachEventListeners();
        this.updateDifficultyDisplay();
    }

    initializeElements() {
        this.elements = {
            // Upload
            uploadArea: document.getElementById('uploadArea'),
            imageUpload: document.getElementById('imageUpload'),
            uploadPlaceholder: document.getElementById('uploadPlaceholder'),
            imagePreview: document.getElementById('imagePreview'),

            // Controls
            puzzleForm: document.querySelectorAll('input[name="puzzleForm"]'),
            pieceType: document.querySelectorAll('input[name="pieceType"]'),
            difficultySlider: document.getElementById('difficultySlider'),
            piecesCount: document.getElementById('piecesCount'),
            piecesGrid: document.getElementById('piecesGrid'),
            paperSize: document.querySelectorAll('input[name="paperSize"]'),
            keepAspectRatio: document.getElementById('keepAspectRatio'),
            margin: document.getElementById('margin'),
            lineWidth: document.getElementById('lineWidth'),
            generateBtn: document.getElementById('generateBtn'),

            // Preview
            previewContainer: document.getElementById('previewContainer'),
            previewInfo: document.getElementById('previewInfo'),

            // Export buttons
            exportPNG: document.getElementById('exportPNG'),
            exportSVG: document.getElementById('exportSVG'),
            exportDXF: document.getElementById('exportDXF'),
            exportCutLines: document.getElementById('exportCutLines')
        };
    }

    attachEventListeners() {
        // Upload area click
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.imageUpload.click();
        });

        // File input change
        this.elements.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));

        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // Difficulty slider
        this.elements.difficultySlider.addEventListener('input', () => {
            this.updateDifficultyDisplay();
        });

        // Form change - update difficulty display
        this.elements.puzzleForm.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateDifficultyDisplay();
            });
        });

        // Generate button
        this.elements.generateBtn.addEventListener('click', () => this.generatePuzzle());

        // Export buttons
        this.elements.exportPNG.addEventListener('click', () => this.exportPNG());
        this.elements.exportSVG.addEventListener('click', () => this.exportSVG());
        this.elements.exportDXF.addEventListener('click', () => this.exportDXF());
        this.elements.exportCutLines.addEventListener('click', () => this.exportCutLines());
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadImage(file);
        }
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.imageData = e.target.result;
                this.imageWidth = img.naturalWidth;
                this.imageHeight = img.naturalHeight;

                // Show preview
                this.elements.imagePreview.src = this.imageData;
                this.elements.imagePreview.style.display = 'block';
                this.elements.uploadPlaceholder.style.display = 'none';

                // Update difficulty display with new aspect ratio
                this.updateDifficultyDisplay();

                this.showNotification(`Изображение загружено! ${this.imageWidth}×${this.imageHeight}px`);
            };
            img.onerror = () => {
                this.showNotification('Ошибка загрузки изображения', 'error');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    getSelectedValue(radioButtons) {
        for (const radio of radioButtons) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return null;
    }

    updateDifficultyDisplay() {
        const level = parseInt(this.elements.difficultySlider.value);
        const form = this.getSelectedValue(this.elements.puzzleForm);

        // Calculate aspect ratio from image if available
        let aspectRatio = 1.5; // Default landscape
        if (this.imageWidth && this.imageHeight) {
            aspectRatio = this.imageWidth / this.imageHeight;
        }

        let grid;
        if (form === 'circular') {
            grid = PuzzleGenerator.getCircularDifficultyGrid(level);
            const pieces = grid.segments * grid.rings;
            this.elements.piecesCount.textContent = pieces;
            this.elements.piecesGrid.textContent = `(${grid.segments} × ${grid.rings})`;
        } else {
            grid = PuzzleGenerator.getDifficultyGrid(level, aspectRatio);
            const pieces = grid.cols * grid.rows;
            this.elements.piecesCount.textContent = pieces;
            this.elements.piecesGrid.textContent = `(${grid.cols} × ${grid.rows})`;
        }
    }

    generatePuzzle() {
        const form = this.getSelectedValue(this.elements.puzzleForm);
        const pieceType = this.getSelectedValue(this.elements.pieceType);
        const paperSize = this.getSelectedValue(this.elements.paperSize);
        const keepAspectRatio = this.elements.keepAspectRatio.checked;
        const margin = parseFloat(this.elements.margin.value) || 10;
        const lineWidth = parseFloat(this.elements.lineWidth.value) || 0.5;
        const level = parseInt(this.elements.difficultySlider.value);

        // Calculate aspect ratio from image
        let aspectRatio = 1.5;
        if (this.imageWidth && this.imageHeight) {
            aspectRatio = this.imageWidth / this.imageHeight;
        }

        // Get dimensions based on settings
        let dimensions;
        if (keepAspectRatio && this.imageWidth && this.imageHeight) {
            // Use image aspect ratio
            dimensions = PuzzleGenerator.getImageBasedDimensions(
                this.imageWidth,
                this.imageHeight,
                paperSize,
                margin
            );
        } else {
            // Use standard paper size
            dimensions = PuzzleGenerator.getPaperDimensions(paperSize, 'landscape', margin);
        }

        // Get grid based on form and difficulty
        let cols, rows;
        if (form === 'circular') {
            const grid = PuzzleGenerator.getCircularDifficultyGrid(level);
            cols = grid.segments;
            rows = grid.rings;
        } else {
            const grid = PuzzleGenerator.getDifficultyGrid(level, aspectRatio);
            cols = grid.cols;
            rows = grid.rows;
        }

        try {
            this.currentPuzzle = this.generator.generate({
                form,
                pieceType,
                cols,
                rows,
                width: dimensions.width,
                height: dimensions.height,
                margin: dimensions.margin,
                lineWidth: lineWidth * dimensions.mmToPixels
            });

            this.renderPreview();
            this.enableExportButtons();

            const totalPieces = cols * rows;
            this.showNotification(`Пазл создан! ${totalPieces} частей (${cols}×${rows})`);
        } catch (error) {
            console.error('Generation error:', error);
            this.showNotification('Ошибка при создании пазла: ' + error.message, 'error');
        }
    }

    renderPreview() {
        if (!this.currentPuzzle) return;

        // Clear preview
        this.elements.previewContainer.innerHTML = '';

        // Create SVG preview element
        const svg = ExportUtils.createSVGPreview(this.currentPuzzle, this.imageData);
        this.elements.previewContainer.appendChild(svg);

        // Update info
        const { cols, rows, form, pieceType } = this.currentPuzzle;
        const formNames = {
            rectangular: 'Прямоугольный',
            square: 'Квадратный',
            circular: 'Круговой'
        };
        const typeNames = {
            classic: 'Классический',
            grid: 'Квадратики'
        };

        this.elements.previewInfo.innerHTML = `
            <span>${formNames[form] || form}</span> |
            <span>${typeNames[pieceType] || pieceType}</span> |
            <span>${cols * rows} частей</span>
        `;
    }

    enableExportButtons() {
        this.elements.exportPNG.disabled = false;
        this.elements.exportSVG.disabled = false;
        this.elements.exportDXF.disabled = false;
        this.elements.exportCutLines.disabled = false;
    }

    getTimestamp() {
        return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    }

    async exportPNG() {
        if (!this.currentPuzzle) return;

        try {
            this.showNotification('Создание PNG...');
            const blob = await ExportUtils.exportPNG(this.currentPuzzle, this.imageData, 3);
            ExportUtils.downloadBlob(blob, `puzzle-${this.getTimestamp()}.png`);
            this.showNotification('PNG с изображением скачан!');
        } catch (error) {
            console.error('PNG export error:', error);
            this.showNotification('Ошибка экспорта PNG: ' + error.message, 'error');
        }
    }

    async exportSVG() {
        if (!this.currentPuzzle) return;

        try {
            const svgContent = ExportUtils.exportSVG(this.currentPuzzle, this.imageData);
            ExportUtils.downloadFile(svgContent, `puzzle-${this.getTimestamp()}.svg`, 'image/svg+xml');
            this.showNotification('SVG файл скачан!');
        } catch (error) {
            console.error('SVG export error:', error);
            this.showNotification('Ошибка экспорта SVG: ' + error.message, 'error');
        }
    }

    exportDXF() {
        if (!this.currentPuzzle) return;

        try {
            const dxfContent = ExportUtils.exportDXF(this.currentPuzzle);
            ExportUtils.downloadFile(dxfContent, `puzzle-${this.getTimestamp()}.dxf`, 'application/dxf');
            this.showNotification('DXF файл скачан! Готов для ЧПУ.');
        } catch (error) {
            console.error('DXF export error:', error);
            this.showNotification('Ошибка экспорта DXF: ' + error.message, 'error');
        }
    }

    async exportCutLines() {
        if (!this.currentPuzzle) return;

        try {
            this.showNotification('Создание PNG контуров...');
            const blob = await ExportUtils.exportPNGCutLines(this.currentPuzzle, 3);
            ExportUtils.downloadBlob(blob, `puzzle-cutlines-${this.getTimestamp()}.png`);
            this.showNotification('PNG контуров скачан!');
        } catch (error) {
            console.error('Cut lines export error:', error);
            this.showNotification('Ошибка экспорта контуров: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            background: type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            zIndex: '10000',
            fontWeight: '600',
            maxWidth: '350px',
            animation: 'slideIn 0.3s ease-out'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.puzzleApp = new PuzzleApp();
});
