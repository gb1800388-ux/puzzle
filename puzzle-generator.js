/**
 * Puzzle Generator - Core puzzle piece generation algorithms
 */

class PuzzleGenerator {
    constructor() {
        this.currentPuzzle = null;
    }

    /**
     * Generate puzzle based on shape type
     */
    generate(options) {
        const { shape, cols, rows, width, height, margin } = options;

        switch (shape) {
            case 'classic':
                return this.generateClassicPuzzle(cols, rows, width, height, margin);
            case 'square':
                return this.generateSquarePuzzle(cols, rows, width, height, margin);
            default:
                throw new Error('Unknown puzzle shape');
        }
    }

    /**
     * Generate simple square pieces (no tabs/blanks)
     */
    generateSquarePuzzle(cols, rows, width, height, margin) {
        const pieces = [];
        const pieceWidth = (width - 2 * margin) / cols;
        const pieceHeight = (height - 2 * margin) / rows;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = margin + col * pieceWidth;
                const y = margin + row * pieceHeight;

                const path = `M ${x} ${y} L ${x + pieceWidth} ${y} L ${x + pieceWidth} ${y + pieceHeight} L ${x} ${y + pieceHeight} Z`;

                pieces.push({
                    path,
                    row,
                    col,
                    bounds: { x, y, width: pieceWidth, height: pieceHeight }
                });
            }
        }

        return {
            pieces,
            width,
            height,
            cols,
            rows,
            type: 'square'
        };
    }

    /**
     * Generate classic jigsaw puzzle with tabs and blanks
     */
    generateClassicPuzzle(cols, rows, width, height, margin) {
        const pieces = [];
        const pieceWidth = (width - 2 * margin) / cols;
        const pieceHeight = (height - 2 * margin) / rows;
        const tabSize = Math.min(pieceWidth, pieceHeight) * 0.2;

        // Generate connection matrix (where tabs stick out)
        const horizontalTabs = this.generateTabMatrix(cols - 1, rows);
        const verticalTabs = this.generateTabMatrix(cols, rows - 1);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = margin + col * pieceWidth;
                const y = margin + row * pieceHeight;

                const piece = this.createJigsawPiece({
                    x, y,
                    width: pieceWidth,
                    height: pieceHeight,
                    tabSize,
                    hasTopTab: row > 0 ? verticalTabs[row - 1][col] : 0,
                    hasRightTab: col < cols - 1 ? horizontalTabs[row][col] : 0,
                    hasBottomTab: row < rows - 1 ? -verticalTabs[row][col] : 0,
                    hasLeftTab: col > 0 ? -horizontalTabs[row][col - 1] : 0,
                    row, col
                });

                pieces.push(piece);
            }
        }

        return {
            pieces,
            width,
            height,
            cols,
            rows,
            type: 'classic'
        };
    }

    /**
     * Generate circular puzzle with radial pieces
     */
    generateCircularPuzzle(cols, rows, width, height, margin) {
        const pieces = [];
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 - margin;
        const radiusStep = maxRadius / rows;
        const angleStep = (Math.PI * 2) / cols;

        for (let ring = 0; ring < rows; ring++) {
            const innerRadius = ring * radiusStep;
            const outerRadius = (ring + 1) * radiusStep;

            for (let segment = 0; segment < cols; segment++) {
                const startAngle = segment * angleStep;
                const endAngle = (segment + 1) * angleStep;

                const piece = this.createCircularPiece({
                    centerX, centerY,
                    innerRadius, outerRadius,
                    startAngle, endAngle,
                    ring, segment
                });

                pieces.push(piece);
            }
        }

        return {
            pieces,
            width,
            height,
            cols,
            rows,
            type: 'circular'
        };
    }

    /**
     * Create a jigsaw puzzle piece with tabs and blanks
     */
    createJigsawPiece(options) {
        const { x, y, width, height, tabSize, hasTopTab, hasRightTab, hasBottomTab, hasLeftTab, row, col } = options;

        let path = `M ${x} ${y} `;

        // Top edge
        path += this.createEdgePath(x, y, x + width, y, hasTopTab);

        // Right edge
        path += this.createEdgePath(x + width, y, x + width, y + height, hasRightTab);

        // Bottom edge (reverse direction, invert tab)
        path += this.createEdgePath(x + width, y + height, x, y + height, -hasBottomTab);

        // Left edge (reverse direction, invert tab)
        path += this.createEdgePath(x, y + height, x, y, -hasLeftTab);

        path += 'Z';

        return {
            path,
            row,
            col,
            bounds: { x, y, width, height }
        };
    }

    /**
     * Create edge path with tab/blank using cubic Bezier curves
     */
    createEdgePath(x1, y1, x2, y2, tabType) {
        if (tabType === 0) {
            // Straight edge
            return `L ${x2} ${y2} `;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Normalized direction
        const nx = dx / len;
        const ny = dy / len;

        // Perpendicular direction (90 degrees)
        const px = -ny;
        const py = nx;

        // Tab parameters
        const neckWidth = len * 0.15;  // Ширина "шейки" замка
        const tabHeight = len * 0.25;   // Высота выступа замка
        const sign = tabType;           // 1 = выступ, -1 = впадина

        // Key points along the edge
        const p1x = x1 + dx * 0.25;
        const p1y = y1 + dy * 0.25;
        const p2x = x1 + dx * 0.35;
        const p2y = y1 + dy * 0.35;
        const p3x = x1 + dx * 0.5;
        const p3y = y1 + dy * 0.5;
        const p4x = x1 + dx * 0.65;
        const p4y = y1 + dy * 0.65;
        const p5x = x1 + dx * 0.75;
        const p5y = y1 + dy * 0.75;

        // Tip of the tab
        const tipX = p3x + px * tabHeight * sign;
        const tipY = p3y + py * tabHeight * sign;

        // Build path with cubic Bezier curves
        let path = '';

        // Curve into neck
        path += `C ${x1 + dx * 0.1 + px * neckWidth * sign} ${y1 + dy * 0.1 + py * neckWidth * sign}, `;
        path += `${p1x + px * neckWidth * sign} ${p1y + py * neckWidth * sign}, `;
        path += `${p2x} ${p2y} `;

        // Curve to tip
        path += `C ${p2x + dx * 0.05} ${p2y + dy * 0.05}, `;
        path += `${tipX - dx * 0.05} ${tipY - dy * 0.05}, `;
        path += `${tipX} ${tipY} `;

        // Curve from tip
        path += `C ${tipX + dx * 0.05} ${tipY + dy * 0.05}, `;
        path += `${p4x - dx * 0.05} ${p4y - dy * 0.05}, `;
        path += `${p4x} ${p4y} `;

        // Curve out of neck
        path += `C ${p4x + px * neckWidth * sign} ${p4y + py * neckWidth * sign}, `;
        path += `${x2 - dx * 0.1 + px * neckWidth * sign} ${y2 - dy * 0.1 + py * neckWidth * sign}, `;
        path += `${x2} ${y2} `;

        return path;
    }

    /**
     * Create circular puzzle piece
     */
    createCircularPiece(options) {
        const { centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, ring, segment } = options;

        // Calculate points
        const x1 = centerX + Math.cos(startAngle) * innerRadius;
        const y1 = centerY + Math.sin(startAngle) * innerRadius;
        const x2 = centerX + Math.cos(endAngle) * innerRadius;
        const y2 = centerY + Math.sin(endAngle) * innerRadius;
        const x3 = centerX + Math.cos(endAngle) * outerRadius;
        const y3 = centerY + Math.sin(endAngle) * outerRadius;
        const x4 = centerX + Math.cos(startAngle) * outerRadius;
        const y4 = centerY + Math.sin(startAngle) * outerRadius;

        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

        let path = `M ${x1} ${y1}`;

        // Inner arc
        if (innerRadius > 0) {
            path += ` A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2}`;
        }

        // Right edge
        path += ` L ${x3} ${y3}`;

        // Outer arc
        path += ` A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${x4} ${y4}`;

        // Left edge
        path += ` L ${x1} ${y1} Z`;

        return {
            path,
            ring,
            segment,
            bounds: {
                x: centerX - outerRadius,
                y: centerY - outerRadius,
                width: outerRadius * 2,
                height: outerRadius * 2
            }
        };
    }

    /**
     * Generate random tab matrix (1 = tab out, -1 = tab in)
     */
    generateTabMatrix(cols, rows) {
        const matrix = [];
        for (let row = 0; row < rows; row++) {
            matrix[row] = [];
            for (let col = 0; col < cols; col++) {
                matrix[row][col] = Math.random() > 0.5 ? 1 : -1;
            }
        }
        return matrix;
    }

    /**
     * Calculate puzzle dimensions based on paper size and orientation
     */
    static getPaperDimensions(paperSize, margin, orientation = 'landscape') {
        // Base dimensions in portrait orientation
        const dimensions = {
            a4: { width: 210, height: 297 }, // mm (portrait)
            a3: { width: 297, height: 420 }  // mm (portrait)
        };

        let paper = dimensions[paperSize];

        // Swap dimensions for landscape orientation
        if (orientation === 'landscape') {
            paper = { width: paper.height, height: paper.width };
        }

        const mmToPixels = 3.7795275591; // 96 DPI

        return {
            width: paper.width * mmToPixels,
            height: paper.height * mmToPixels,
            widthMM: paper.width,
            heightMM: paper.height,
            margin: margin * mmToPixels
        };
    }

    /**
     * Get piece count based on difficulty
     */
    static getDifficultySettings(difficulty) {
        const settings = {
            easy: { cols: 3, rows: 2 },
            medium: { cols: 4, rows: 3 },
            hard: { cols: 6, rows: 4 },
            expert: { cols: 8, rows: 6 }
        };
        return settings[difficulty] || settings.medium;
    }
}
