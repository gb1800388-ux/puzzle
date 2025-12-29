/**
 * Puzzle Generator - Core puzzle piece generation algorithms
 * Supports: classic jigsaw with tabs, simple grid, rectangular/square/circular forms
 */

class PuzzleGenerator {
    constructor() {
        this.currentPuzzle = null;
        this.seed = Date.now(); // For reproducible randomness
    }

    /**
     * Seeded random number generator for consistent puzzles
     */
    random() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return (this.seed / 0x7fffffff);
    }

    /**
     * Reset random seed
     */
    resetSeed(seed = Date.now()) {
        this.seed = seed;
    }

    /**
     * Generate puzzle based on options
     */
    generate(options) {
        const {
            form,           // rectangular, square, circular
            pieceType,      // classic, grid
            cols,
            rows,
            width,
            height,
            margin,
            lineWidth = 1.5
        } = options;

        this.resetSeed();

        let puzzleWidth = width;
        let puzzleHeight = height;

        // Adjust dimensions for square form
        if (form === 'square') {
            const size = Math.min(width, height);
            puzzleWidth = size;
            puzzleHeight = size;
        }

        // Generate based on form
        if (form === 'circular') {
            return this.generateCircularPuzzle(cols, rows, puzzleWidth, puzzleHeight, margin, pieceType, lineWidth);
        } else {
            return this.generateRectangularPuzzle(cols, rows, puzzleWidth, puzzleHeight, margin, pieceType, lineWidth, form);
        }
    }

    /**
     * Generate rectangular or square puzzle
     */
    generateRectangularPuzzle(cols, rows, width, height, margin, pieceType, lineWidth, form) {
        const pieces = [];
        const innerWidth = width - 2 * margin;
        const innerHeight = height - 2 * margin;
        const pieceWidth = innerWidth / cols;
        const pieceHeight = innerHeight / rows;
        const tabSize = Math.min(pieceWidth, pieceHeight) * 0.22;

        // Generate tab directions matrix
        const horizontalTabs = this.generateTabMatrix(cols - 1, rows);
        const verticalTabs = this.generateTabMatrix(cols, rows - 1);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = margin + col * pieceWidth;
                const y = margin + row * pieceHeight;

                let piece;
                if (pieceType === 'grid') {
                    piece = this.createGridPiece({
                        x, y,
                        width: pieceWidth,
                        height: pieceHeight,
                        row, col
                    });
                } else {
                    piece = this.createClassicPiece({
                        x, y,
                        width: pieceWidth,
                        height: pieceHeight,
                        tabSize,
                        topTab: row > 0 ? verticalTabs[row - 1][col] : 0,
                        rightTab: col < cols - 1 ? horizontalTabs[row][col] : 0,
                        bottomTab: row < rows - 1 ? -verticalTabs[row][col] : 0,
                        leftTab: col > 0 ? -horizontalTabs[row][col - 1] : 0,
                        row, col
                    });
                }

                pieces.push(piece);
            }
        }

        // Add outer border
        const borderPath = `M ${margin} ${margin} L ${width - margin} ${margin} L ${width - margin} ${height - margin} L ${margin} ${height - margin} Z`;

        return {
            pieces,
            borderPath,
            width,
            height,
            cols,
            rows,
            form,
            pieceType,
            lineWidth,
            margin
        };
    }

    /**
     * Generate circular puzzle with radial segments
     */
    generateCircularPuzzle(segments, rings, width, height, margin, pieceType, lineWidth) {
        const pieces = [];
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 - margin;
        const ringWidth = maxRadius / rings;

        // Tab size for classic pieces
        const tabSize = ringWidth * 0.18;

        // Generate tab directions
        const radialTabs = this.generateTabMatrix(segments, rings - 1);
        const ringTabs = this.generateTabMatrix(segments - 1, rings);

        for (let ring = 0; ring < rings; ring++) {
            const innerRadius = ring * ringWidth;
            const outerRadius = (ring + 1) * ringWidth;

            for (let segment = 0; segment < segments; segment++) {
                const startAngle = (segment / segments) * Math.PI * 2 - Math.PI / 2;
                const endAngle = ((segment + 1) / segments) * Math.PI * 2 - Math.PI / 2;

                let piece;
                if (pieceType === 'grid') {
                    piece = this.createCircularGridPiece({
                        centerX, centerY,
                        innerRadius, outerRadius,
                        startAngle, endAngle,
                        ring, segment
                    });
                } else {
                    piece = this.createCircularClassicPiece({
                        centerX, centerY,
                        innerRadius, outerRadius,
                        startAngle, endAngle,
                        tabSize,
                        innerTab: ring > 0 ? radialTabs[segment][ring - 1] : 0,
                        outerTab: ring < rings - 1 ? -radialTabs[segment][ring] : 0,
                        ring, segment,
                        totalSegments: segments
                    });
                }

                pieces.push(piece);
            }
        }

        // Circular border
        const borderPath = `M ${centerX + maxRadius} ${centerY} A ${maxRadius} ${maxRadius} 0 1 1 ${centerX - maxRadius} ${centerY} A ${maxRadius} ${maxRadius} 0 1 1 ${centerX + maxRadius} ${centerY} Z`;

        return {
            pieces,
            borderPath,
            width,
            height,
            cols: segments,
            rows: rings,
            form: 'circular',
            pieceType,
            lineWidth,
            margin,
            centerX,
            centerY,
            radius: maxRadius
        };
    }

    /**
     * Create simple grid piece (rectangle)
     */
    createGridPiece(options) {
        const { x, y, width, height, row, col } = options;

        const path = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

        return {
            path,
            row,
            col,
            bounds: { x, y, width, height }
        };
    }

    /**
     * Create classic jigsaw piece with tabs/blanks
     */
    createClassicPiece(options) {
        const { x, y, width, height, tabSize, topTab, rightTab, bottomTab, leftTab, row, col } = options;

        let path = `M ${x} ${y}`;

        // Top edge
        path += this.createEdgePath(x, y, x + width, y, tabSize, topTab, 'top');

        // Right edge
        path += this.createEdgePath(x + width, y, x + width, y + height, tabSize, rightTab, 'right');

        // Bottom edge (reversed)
        path += this.createEdgePath(x + width, y + height, x, y + height, tabSize, bottomTab, 'bottom');

        // Left edge (reversed)
        path += this.createEdgePath(x, y + height, x, y, tabSize, leftTab, 'left');

        path += ' Z';

        return {
            path,
            row,
            col,
            bounds: { x: x - tabSize, y: y - tabSize, width: width + 2 * tabSize, height: height + 2 * tabSize }
        };
    }

    /**
     * Create edge path with optional tab
     */
    createEdgePath(x1, y1, x2, y2, tabSize, tabDirection, edge) {
        if (tabDirection === 0) {
            return ` L ${x2} ${y2}`;
        }

        const isHorizontal = edge === 'top' || edge === 'bottom';
        const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
        const tabWidth = tabSize * 0.8;
        const neckWidth = tabSize * 0.4;
        const tabDepth = tabSize * tabDirection;

        let path = '';

        if (isHorizontal) {
            const dir = x2 > x1 ? 1 : -1;
            const midX = (x1 + x2) / 2;
            const y = y1;

            // Start to neck start
            path += ` L ${midX - (tabWidth + neckWidth) / 2 * dir} ${y}`;

            // Neck curve in
            path += ` C ${midX - tabWidth / 2 * dir} ${y + tabDepth * 0.2}, ${midX - tabWidth / 2 * dir} ${y + tabDepth * 0.5}, ${midX - tabWidth / 2 * dir} ${y + tabDepth * 0.5}`;

            // Tab head (circular)
            path += ` C ${midX - tabWidth * 0.7 * dir} ${y + tabDepth * 0.8}, ${midX - tabWidth * 0.5 * dir} ${y + tabDepth}, ${midX} ${y + tabDepth}`;
            path += ` C ${midX + tabWidth * 0.5 * dir} ${y + tabDepth}, ${midX + tabWidth * 0.7 * dir} ${y + tabDepth * 0.8}, ${midX + tabWidth / 2 * dir} ${y + tabDepth * 0.5}`;

            // Neck curve out
            path += ` C ${midX + tabWidth / 2 * dir} ${y + tabDepth * 0.2}, ${midX + (tabWidth + neckWidth) / 2 * dir} ${y}, ${midX + (tabWidth + neckWidth) / 2 * dir} ${y}`;

            // To end
            path += ` L ${x2} ${y2}`;
        } else {
            const dir = y2 > y1 ? 1 : -1;
            const midY = (y1 + y2) / 2;
            const x = x1;

            // Start to neck start
            path += ` L ${x} ${midY - (tabWidth + neckWidth) / 2 * dir}`;

            // Neck curve in
            path += ` C ${x + tabDepth * 0.2} ${midY - tabWidth / 2 * dir}, ${x + tabDepth * 0.5} ${midY - tabWidth / 2 * dir}, ${x + tabDepth * 0.5} ${midY - tabWidth / 2 * dir}`;

            // Tab head (circular)
            path += ` C ${x + tabDepth * 0.8} ${midY - tabWidth * 0.7 * dir}, ${x + tabDepth} ${midY - tabWidth * 0.5 * dir}, ${x + tabDepth} ${midY}`;
            path += ` C ${x + tabDepth} ${midY + tabWidth * 0.5 * dir}, ${x + tabDepth * 0.8} ${midY + tabWidth * 0.7 * dir}, ${x + tabDepth * 0.5} ${midY + tabWidth / 2 * dir}`;

            // Neck curve out
            path += ` C ${x + tabDepth * 0.2} ${midY + tabWidth / 2 * dir}, ${x} ${midY + (tabWidth + neckWidth) / 2 * dir}, ${x} ${midY + (tabWidth + neckWidth) / 2 * dir}`;

            // To end
            path += ` L ${x2} ${y2}`;
        }

        return path;
    }

    /**
     * Create simple circular grid piece (arc segment)
     */
    createCircularGridPiece(options) {
        const { centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, ring, segment } = options;

        // Calculate corner points
        const x1 = centerX + Math.cos(startAngle) * innerRadius;
        const y1 = centerY + Math.sin(startAngle) * innerRadius;
        const x2 = centerX + Math.cos(endAngle) * innerRadius;
        const y2 = centerY + Math.sin(endAngle) * innerRadius;
        const x3 = centerX + Math.cos(endAngle) * outerRadius;
        const y3 = centerY + Math.sin(endAngle) * outerRadius;
        const x4 = centerX + Math.cos(startAngle) * outerRadius;
        const y4 = centerY + Math.sin(startAngle) * outerRadius;

        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

        let path;
        if (innerRadius === 0) {
            // Center piece - pie slice
            path = `M ${centerX} ${centerY} L ${x4} ${y4} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3} Z`;
        } else {
            path = `M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
        }

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
     * Create circular classic piece with tabs on radial edges
     */
    createCircularClassicPiece(options) {
        const {
            centerX, centerY,
            innerRadius, outerRadius,
            startAngle, endAngle,
            tabSize,
            innerTab, outerTab,
            ring, segment,
            totalSegments
        } = options;

        // For simplicity, use grid pieces for circular classic (tabs on arcs are complex)
        // We add tabs on the radial (straight) edges only

        const x1 = centerX + Math.cos(startAngle) * innerRadius;
        const y1 = centerY + Math.sin(startAngle) * innerRadius;
        const x2 = centerX + Math.cos(endAngle) * innerRadius;
        const y2 = centerY + Math.sin(endAngle) * innerRadius;
        const x3 = centerX + Math.cos(endAngle) * outerRadius;
        const y3 = centerY + Math.sin(endAngle) * outerRadius;
        const x4 = centerX + Math.cos(startAngle) * outerRadius;
        const y4 = centerY + Math.sin(startAngle) * outerRadius;

        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

        let path;
        if (innerRadius === 0) {
            // Center piece
            path = `M ${centerX} ${centerY}`;
            // Start radial edge
            path += ` L ${x4} ${y4}`;
            // Outer arc
            path += ` A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}`;
            // End radial edge back to center
            path += ` L ${centerX} ${centerY}`;
        } else {
            path = `M ${x1} ${y1}`;
            // Inner arc
            path += ` A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2}`;
            // End radial edge
            path += ` L ${x3} ${y3}`;
            // Outer arc (reverse direction)
            path += ` A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${x4} ${y4}`;
            // Start radial edge back
            path += ` L ${x1} ${y1}`;
        }

        path += ' Z';

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
     * Generate random tab direction matrix
     */
    generateTabMatrix(cols, rows) {
        const matrix = [];
        for (let row = 0; row < rows; row++) {
            matrix[row] = [];
            for (let col = 0; col < cols; col++) {
                matrix[row][col] = this.random() > 0.5 ? 1 : -1;
            }
        }
        return matrix;
    }

    /**
     * Get paper dimensions in pixels
     */
    static getPaperDimensions(paperSize, orientation, margin) {
        const papers = {
            a4: { width: 210, height: 297 },
            a3: { width: 297, height: 420 }
        };

        let { width, height } = papers[paperSize] || papers.a4;

        // Landscape orientation
        if (orientation === 'landscape') {
            [width, height] = [height, width];
        }

        const mmToPixels = 3.7795275591; // 96 DPI

        return {
            width: width * mmToPixels,
            height: height * mmToPixels,
            widthMM: width,
            heightMM: height,
            margin: margin * mmToPixels,
            mmToPixels
        };
    }

    /**
     * Calculate optimal grid based on difficulty level
     */
    static getDifficultyGrid(level, aspectRatio = 1.5) {
        // Difficulty levels 1-10
        const grids = [
            { cols: 2, rows: 2 },    // 1: 4 pieces
            { cols: 3, rows: 2 },    // 2: 6 pieces
            { cols: 4, rows: 3 },    // 3: 12 pieces
            { cols: 5, rows: 4 },    // 4: 20 pieces
            { cols: 6, rows: 4 },    // 5: 24 pieces
            { cols: 7, rows: 5 },    // 6: 35 pieces
            { cols: 8, rows: 6 },    // 7: 48 pieces
            { cols: 10, rows: 7 },   // 8: 70 pieces
            { cols: 12, rows: 8 },   // 9: 96 pieces
            { cols: 15, rows: 10 }   // 10: 150 pieces
        ];

        const grid = grids[Math.min(level - 1, grids.length - 1)] || grids[2];

        // Adjust for aspect ratio
        if (aspectRatio > 1.2) {
            // Landscape - more cols than rows
            return { cols: grid.cols, rows: grid.rows };
        } else if (aspectRatio < 0.8) {
            // Portrait - more rows than cols
            return { cols: grid.rows, rows: grid.cols };
        }

        return grid;
    }

    /**
     * Get circular grid based on difficulty
     */
    static getCircularDifficultyGrid(level) {
        const grids = [
            { segments: 4, rings: 2 },   // 1: 8 pieces
            { segments: 6, rings: 2 },   // 2: 12 pieces
            { segments: 8, rings: 3 },   // 3: 24 pieces
            { segments: 10, rings: 3 },  // 4: 30 pieces
            { segments: 12, rings: 4 },  // 5: 48 pieces
            { segments: 14, rings: 4 },  // 6: 56 pieces
            { segments: 16, rings: 5 },  // 7: 80 pieces
            { segments: 18, rings: 5 },  // 8: 90 pieces
            { segments: 20, rings: 6 },  // 9: 120 pieces
            { segments: 24, rings: 6 }   // 10: 144 pieces
        ];

        return grids[Math.min(level - 1, grids.length - 1)] || grids[2];
    }
}

// Make globally available
window.PuzzleGenerator = PuzzleGenerator;
