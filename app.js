/**
 * Main Application Logic
 */

class PuzzleApp {
    constructor() {
        this.generator = new PuzzleGenerator();
        this.currentPuzzle = null;
        this.currentImage = null;
        this.imageData = null;

        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.elements = {
            imageUpload: document.getElementById('imageUpload'),
            puzzleShape: document.getElementById('puzzleShape'),
            difficulty: document.getElementById('difficulty'),
            customPiecesGroup: document.getElementById('customPiecesGroup'),
            piecesX: document.getElementById('piecesX'),
            piecesY: document.getElementById('piecesY'),
            paperSize: document.getElementById('paperSize'),
            orientation: document.getElementById('orientation'),
            margin: document.getElementById('margin'),
            generateBtn: document.getElementById('generateBtn'),
            previewCanvas: document.getElementById('previewCanvas'),
            exportSVG: document.getElementById('exportSVG'),
            exportPNG: document.getElementById('exportPNG'),
            exportDXF: document.getElementById('exportDXF')
        };
    }

    attachEventListeners() {
        // Image upload
        this.elements.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));

        // Difficulty change
        this.elements.difficulty.addEventListener('change', (e) => this.handleDifficultyChange(e));

        // Generate button
        this.elements.generateBtn.addEventListener('click', () => this.generatePuzzle());

        // Export buttons
        this.elements.exportSVG.addEventListener('click', () => this.exportSVG());
        this.elements.exportPNG.addEventListener('click', () => this.exportPNG());
        this.elements.exportDXF.addEventListener('click', () => this.exportDXF());

        // Shape change
        this.elements.puzzleShape.addEventListener('change', () => {
            if (this.currentPuzzle) {
                this.generatePuzzle();
            }
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.imageData = e.target.result;
                this.showNotification('Изображение загружено! Нажмите "Генерировать пазл"');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleDifficultyChange(event) {
        const difficulty = event.target.value;
        if (difficulty === 'custom') {
            this.elements.customPiecesGroup.style.display = 'block';
        } else {
            this.elements.customPiecesGroup.style.display = 'none';
        }
    }

    generatePuzzle() {
        const shape = this.elements.puzzleShape.value;
        const difficulty = this.elements.difficulty.value;
        const paperSize = this.elements.paperSize.value;
        const orientation = this.elements.orientation.value;
        const margin = parseFloat(this.elements.margin.value);

        // Get dimensions with orientation
        const dimensions = PuzzleGenerator.getPaperDimensions(paperSize, margin, orientation);

        // Get piece count
        let cols, rows;
        if (difficulty === 'custom') {
            cols = parseInt(this.elements.piecesX.value);
            rows = parseInt(this.elements.piecesY.value);
        } else {
            const settings = PuzzleGenerator.getDifficultySettings(difficulty);
            cols = settings.cols;
            rows = settings.rows;
        }

        // Generate puzzle
        try {
            this.currentPuzzle = this.generator.generate({
                shape,
                cols,
                rows,
                width: dimensions.width,
                height: dimensions.height,
                margin: dimensions.margin
            });

            this.renderPreview();
            this.enableExportButtons();
            this.showNotification(`Пазл создан! ${cols}×${rows} частей`);
        } catch (error) {
            this.showNotification('Ошибка при создании пазла: ' + error.message, 'error');
        }
    }

    renderPreview() {
        if (!this.currentPuzzle) return;

        // Clear preview
        this.elements.previewCanvas.innerHTML = '';

        // Create SVG element
        const svg = ExportUtils.createSVGElement(this.currentPuzzle, this.imageData);

        // Add to preview
        this.elements.previewCanvas.appendChild(svg);
    }

    enableExportButtons() {
        this.elements.exportSVG.disabled = false;
        this.elements.exportPNG.disabled = false;
        this.elements.exportDXF.disabled = false;
    }

    async exportSVG() {
        if (!this.currentPuzzle) return;

        const svgContent = ExportUtils.exportSVG(this.currentPuzzle, this.imageData);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        ExportUtils.downloadFile(svgContent, `puzzle-${timestamp}.svg`, 'image/svg+xml');
        this.showNotification('SVG файл загружен!');
    }

    async exportPNG() {
        if (!this.currentPuzzle) return;

        try {
            this.showNotification('Создание PNG... Подождите...');
            const blob = await ExportUtils.exportPNG(this.currentPuzzle, this.imageData, 3);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            ExportUtils.downloadBlob(blob, `puzzle-${timestamp}.png`);
            this.showNotification('PNG файл загружен!');
        } catch (error) {
            this.showNotification('Ошибка при создании PNG: ' + error.message, 'error');
        }
    }

    exportDXF() {
        if (!this.currentPuzzle) return;

        const dxfContent = ExportUtils.exportDXF(this.currentPuzzle);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        ExportUtils.downloadFile(dxfContent, `puzzle-${timestamp}.dxf`, 'application/dxf');
        this.showNotification('DXF файл загружен! Готов для ЧПУ (RDWorks)');
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            background: type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '10000',
            fontWeight: '600',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        });

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
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
