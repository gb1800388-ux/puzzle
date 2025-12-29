/**
 * Puzzle Generator - Core puzzle piece generation algorithms
 * Supports: classic jigsaw with tabs, simple grid, rectangular/square/circular forms
 * JigsawPlanet-style classic tabs
 */

class PuzzleGenerator {
    constructor() {
        this.currentPuzzle = null;
        this.seed = Date.now();
    }

    random() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return (this.seed / 0x7fffffff);
    }

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

        // Tab size proportional to piece size (JigsawPlanet style)
        const tabSize = Math.min(pieceWidth, pieceHeight) * 0.20;

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

        for (let ring = 0; ring < rings; ring++) {
            const innerRadius = ring * ringWidth;
            const outerRadius = (ring + 1) * ringWidth;

            for (let segment = 0; segment < segments; segment++) {
                const startAngle = (segment / segments) * Math.PI * 2 - Math.PI / 2;
                const endAngle = ((segment + 1) / segments) * Math.PI * 2 - Math.PI / 2;

                const piece = this.createCircularPiece({
                    centerX, centerY,
                    innerRadius, outerRadius,
                    startAngle, endAngle,
                    ring, segment
                });

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
     * Create classic jigsaw piece with JigsawPlanet-style tabs
     */
    createClassicPiece(options) {
        const { x, y, width, height, tabSize, topTab, rightTab, bottomTab, leftTab, row, col } = options;

        let path = `M ${x} ${y}`;

        // Top edge
        path += this.createJigsawEdge(x, y, x + width, y, tabSize, topTab, 'horizontal');

        // Right edge
        path += this.createJigsawEdge(x + width, y, x + width, y + height, tabSize, rightTab, 'vertical');

        // Bottom edge (reversed)
        path += this.createJigsawEdge(x + width, y + height, x, y + height, tabSize, bottomTab, 'horizontal');

        // Left edge (reversed)
        path += this.createJigsawEdge(x, y + height, x, y, tabSize, leftTab, 'vertical');

        path += ' Z';

        return {
            path,
            row,
            col,
            bounds: { x: x - tabSize, y: y - tabSize, width: width + 2 * tabSize, height: height + 2 * tabSize }
        };
    }

    /**
     * Create JigsawPlanet-style edge with rounded tab
     * This creates the classic puzzle piece shape with a nice rounded knob
     */
    createJigsawEdge(x1, y1, x2, y2, tabSize, tabDirection, orientation) {
        if (tabDirection === 0) {
            return ` L ${x2} ${y2}`;
        }

        const isHorizontal = orientation === 'horizontal';

        // Calculate edge properties
        const edgeLength = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
        const direction = isHorizontal ? (x2 > x1 ? 1 : -1) : (y2 > y1 ? 1 : -1);

        // Tab dimensions - JigsawPlanet style proportions
        const neckWidth = tabSize * 0.5;      // Width of the neck
        const headRadius = tabSize * 0.65;    // Radius of the round head
        const neckLength = tabSize * 0.35;    // How far neck extends before head
        const tabDepth = tabSize * tabDirection; // Positive = outward, negative = inward

        let path = '';

        if (isHorizontal) {
            const midX = (x1 + x2) / 2;
            const y = y1;

            // Start to neck
            const neckStartX = midX - (neckWidth / 2) * direction;
            path += ` L ${neckStartX} ${y}`;

            // Neck going out
            const neckEndY = y + neckLength * Math.sign(tabDepth);
            path += ` L ${neckStartX} ${neckEndY}`;

            // Round head using arc
            const headCenterX = midX;
            const headCenterY = y + tabDepth;

            // Left side of head curve
            path += ` C ${neckStartX - headRadius * 0.3 * direction} ${neckEndY + (tabDepth - neckLength * Math.sign(tabDepth)) * 0.3},`;
            path += ` ${headCenterX - headRadius * direction} ${headCenterY},`;
            path += ` ${headCenterX} ${headCenterY + headRadius * Math.sign(tabDepth) * 0.15}`;

            // Right side of head curve
            path += ` C ${headCenterX + headRadius * direction} ${headCenterY},`;
            path += ` ${midX + (neckWidth / 2) * direction + headRadius * 0.3 * direction} ${neckEndY + (tabDepth - neckLength * Math.sign(tabDepth)) * 0.3},`;
            path += ` ${midX + (neckWidth / 2) * direction} ${neckEndY}`;

            // Neck coming back
            path += ` L ${midX + (neckWidth / 2) * direction} ${y}`;

            // To end point
            path += ` L ${x2} ${y2}`;

        } else {
            const midY = (y1 + y2) / 2;
            const x = x1;

            // Start to neck
            const neckStartY = midY - (neckWidth / 2) * direction;
            path += ` L ${x} ${neckStartY}`;

            // Neck going out
            const neckEndX = x + neckLength * Math.sign(tabDepth);
            path += ` L ${neckEndX} ${neckStartY}`;

            // Round head using curves
            const headCenterX = x + tabDepth;
            const headCenterY = midY;

            // Top side of head curve
            path += ` C ${neckEndX + (tabDepth - neckLength * Math.sign(tabDepth)) * 0.3} ${neckStartY - headRadius * 0.3 * direction},`;
            path += ` ${headCenterX} ${headCenterY - headRadius * direction},`;
            path += ` ${headCenterX + headRadius * Math.sign(tabDepth) * 0.15} ${headCenterY}`;

            // Bottom side of head curve
            path += ` C ${headCenterX} ${headCenterY + headRadius * direction},`;
            path += ` ${neckEndX + (tabDepth - neckLength * Math.sign(tabDepth)) * 0.3} ${midY + (neckWidth / 2) * direction + headRadius * 0.3 * direction},`;
            path += ` ${neckEndX} ${midY + (neckWidth / 2) * direction}`;

            // Neck coming back
            path += ` L ${x} ${midY + (neckWidth / 2) * direction}`;

            // To end point
            path += ` L ${x2} ${y2}`;
        }

        return path;
    }

    /**
     * Create circular puzzle piece (arc segment)
     */
    createCircularPiece(options) {
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
        if (innerRadius < 1) {
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
     * Calculate dimensions based on image aspect ratio
     */
    static getImageBasedDimensions(imageWidth, imageHeight, paperSize, margin) {
        const papers = {
            a4: { maxWidth: 287, maxHeight: 200 }, // A4 landscape with margins
            a3: { maxWidth: 400, maxHeight: 277 }  // A3 landscape with margins
        };

        const paper = papers[paperSize] || papers.a4;
        const mmToPixels = 3.7795275591;

        const aspectRatio = imageWidth / imageHeight;
        let width, height;

        // Fit image within paper bounds while maintaining aspect ratio
        if (aspectRatio > paper.maxWidth / paper.maxHeight) {
            // Image is wider - fit to width
            width = paper.maxWidth;
            height = width / aspectRatio;
        } else {
            // Image is taller - fit to height
            height = paper.maxHeight;
            width = height * aspectRatio;
        }

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
        if (aspectRatio > 1.3) {
            // Landscape - more cols than rows
            return { cols: Math.max(grid.cols, grid.rows), rows: Math.min(grid.cols, grid.rows) };
        } else if (aspectRatio < 0.77) {
            // Portrait - more rows than cols
            return { cols: Math.min(grid.cols, grid.rows), rows: Math.max(grid.cols, grid.rows) };
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
