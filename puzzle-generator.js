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
            case 'rectangular':
            case 'square':
                return this.generateRectangularPuzzle(cols, rows, width, height, margin);
            case 'circular':
                return this.generateCircularPuzzle(cols, rows, width, height, margin);
            default:
                throw new Error('Unknown puzzle shape');
        }
    }

    /**
     * Generate rectangular/square puzzle with classic jigsaw pieces
     */
    generateRectangularPuzzle(cols, rows, width, height, margin) {
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
            type: 'rectangular'
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

        let path = `M ${x} ${y}`;

        // Top edge
        if (hasTopTab !== 0) {
            path += this.createTabPath(x, y, x + width, y, tabSize, hasTopTab, 'horizontal');
        } else {
            path += ` L ${x + width} ${y}`;
        }

        // Right edge
        if (hasRightTab !== 0) {
            path += this.createTabPath(x + width, y, x + width, y + height, tabSize, hasRightTab, 'vertical');
        } else {
            path += ` L ${x + width} ${y + height}`;
        }

        // Bottom edge
        if (hasBottomTab !== 0) {
            path += this.createTabPath(x + width, y + height, x, y + height, tabSize, -hasBottomTab, 'horizontal-reverse');
        } else {
            path += ` L ${x} ${y + height}`;
        }

        // Left edge
        if (hasLeftTab !== 0) {
            path += this.createTabPath(x, y + height, x, y, tabSize, -hasLeftTab, 'vertical-reverse');
        } else {
            path += ` L ${x} ${y}`;
        }

        path += ' Z';

        return {
            path,
            row,
            col,
            bounds: { x, y, width, height }
        };
    }

    /**
     * Create tab/blank path for puzzle piece edge
     */
    createTabPath(x1, y1, x2, y2, tabSize, direction, orientation) {
        const isHorizontal = orientation.includes('horizontal');
        const isReverse = orientation.includes('reverse');
        const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
        const tabWidth = tabSize * 1.5;
        const tabHeight = tabSize * direction;

        let path = '';

        if (isHorizontal) {
            const midX = (x1 + x2) / 2;
            const y = y1;
            const dir = isReverse ? -1 : 1;

            path += ` L ${midX - tabWidth / 2} ${y}`;
            path += ` Q ${midX - tabWidth / 2} ${y + tabHeight * 0.5} ${midX} ${y + tabHeight}`;
            path += ` Q ${midX + tabWidth / 2} ${y + tabHeight * 0.5} ${midX + tabWidth / 2} ${y}`;
            path += ` L ${x2} ${y2}`;
        } else {
            const midY = (y1 + y2) / 2;
            const x = x1;
            const dir = isReverse ? -1 : 1;

            path += ` L ${x} ${midY - tabWidth / 2}`;
            path += ` Q ${x + tabHeight * 0.5} ${midY - tabWidth / 2} ${x + tabHeight} ${midY}`;
            path += ` Q ${x + tabHeight * 0.5} ${midY + tabWidth / 2} ${x} ${midY + tabWidth / 2}`;
            path += ` L ${x2} ${y2}`;
        }

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
     * Calculate puzzle dimensions based on paper size
     */
    static getPaperDimensions(paperSize, margin) {
        const dimensions = {
            a4: { width: 210, height: 297 }, // mm
            a3: { width: 297, height: 420 }  // mm
        };

        const paper = dimensions[paperSize];
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
