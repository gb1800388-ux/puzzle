/**
 * Export Utilities - SVG, PNG, and DXF export functionality
 */

class ExportUtils {
    /**
     * Export puzzle as SVG file
     */
    static exportSVG(puzzleData, imageData = null) {
        const { width, height, pieces } = puzzleData;

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
        ${imageData ? `<pattern id="puzzleImage" x="0" y="0" width="1" height="1">
            <image xlink:href="${imageData}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
        </pattern>` : ''}
    </defs>
`;

        // Add all pieces
        pieces.forEach((piece, index) => {
            const fill = imageData ? 'url(#puzzleImage)' : this.getRandomColor(index);
            svg += `    <path d="${piece.path}" fill="${fill}" stroke="#000000" stroke-width="2" />\n`;
        });

        svg += '</svg>';

        return svg;
    }

    /**
     * Export puzzle as PNG file (rasterized from SVG)
     */
    static async exportPNG(puzzleData, imageData = null, scale = 2) {
        return new Promise((resolve, reject) => {
            const svg = this.exportSVG(puzzleData, imageData);
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = puzzleData.width * scale;
                canvas.height = puzzleData.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                }, 'image/png');
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG'));
            };

            img.src = url;
        });
    }

    /**
     * Export puzzle as DXF file for CNC machines (RDWorks compatible)
     */
    static exportDXF(puzzleData) {
        const { width, height, pieces } = puzzleData;
        const mmToPixels = 3.7795275591;
        const widthMM = width / mmToPixels;
        const heightMM = height / mmToPixels;

        let dxf = '';

        // DXF Header
        dxf += '0\nSECTION\n2\nHEADER\n';
        dxf += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000
        dxf += '9\n$INSUNITS\n70\n4\n'; // Units: mm
        dxf += '0\nENDSEC\n';

        // Tables section
        dxf += '0\nSECTION\n2\nTABLES\n';
        dxf += '0\nTABLE\n2\nLTYPE\n70\n1\n';
        dxf += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
        dxf += '0\nENDTAB\n';

        dxf += '0\nTABLE\n2\nLAYER\n70\n1\n';
        dxf += '0\nLAYER\n2\nPUZZLE_CUT\n70\n0\n62\n7\n6\nCONTINUOUS\n';
        dxf += '0\nENDTAB\n';
        dxf += '0\nENDSEC\n';

        // Entities section
        dxf += '0\nSECTION\n2\nENTITIES\n';

        // Convert each puzzle piece path to DXF entities
        pieces.forEach((piece) => {
            const pathData = this.parseSVGPath(piece.path);
            this.convertPathToDXF(pathData, dxf, mmToPixels);
        });

        // Convert pieces to polylines
        pieces.forEach((piece) => {
            dxf += this.pathToPolyline(piece.path, mmToPixels);
        });

        dxf += '0\nENDSEC\n';
        dxf += '0\nEOF\n';

        return dxf;
    }

    /**
     * Convert SVG path to DXF polyline
     */
    static pathToPolyline(pathString, mmToPixels) {
        const points = this.getPathPoints(pathString);

        if (points.length === 0) return '';

        let dxf = '0\nLWPOLYLINE\n';
        dxf += '8\nPUZZLE_CUT\n'; // Layer name
        dxf += '90\n' + points.length + '\n'; // Number of vertices
        dxf += '70\n1\n'; // Closed polyline

        points.forEach(point => {
            const xMM = point.x / mmToPixels;
            const yMM = point.y / mmToPixels;
            dxf += '10\n' + xMM.toFixed(4) + '\n';
            dxf += '20\n' + yMM.toFixed(4) + '\n';
        });

        return dxf;
    }

    /**
     * Extract points from SVG path (simplified)
     */
    static getPathPoints(pathString, resolution = 20) {
        const points = [];
        const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];

        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        commands.forEach(cmd => {
            const type = cmd[0];
            const values = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat);

            switch (type) {
                case 'M':
                    currentX = values[0];
                    currentY = values[1];
                    startX = currentX;
                    startY = currentY;
                    points.push({ x: currentX, y: currentY });
                    break;

                case 'L':
                    currentX = values[0];
                    currentY = values[1];
                    points.push({ x: currentX, y: currentY });
                    break;

                case 'Q':
                    // Quadratic Bezier - approximate with line segments
                    const cpX = values[0];
                    const cpY = values[1];
                    const endX = values[2];
                    const endY = values[3];

                    for (let i = 1; i <= resolution; i++) {
                        const t = i / resolution;
                        const t1 = 1 - t;
                        const x = t1 * t1 * currentX + 2 * t1 * t * cpX + t * t * endX;
                        const y = t1 * t1 * currentY + 2 * t1 * t * cpY + t * t * endY;
                        points.push({ x, y });
                    }

                    currentX = endX;
                    currentY = endY;
                    break;

                case 'C':
                    // Cubic Bezier - approximate with line segments
                    const cp1X = values[0];
                    const cp1Y = values[1];
                    const cp2X = values[2];
                    const cp2Y = values[3];
                    const cEndX = values[4];
                    const cEndY = values[5];

                    for (let i = 1; i <= resolution; i++) {
                        const t = i / resolution;
                        const t1 = 1 - t;
                        const t1_3 = t1 * t1 * t1;
                        const t1_2_t = 3 * t1 * t1 * t;
                        const t1_t_2 = 3 * t1 * t * t;
                        const t_3 = t * t * t;

                        const x = t1_3 * currentX + t1_2_t * cp1X + t1_t_2 * cp2X + t_3 * cEndX;
                        const y = t1_3 * currentY + t1_2_t * cp1Y + t1_t_2 * cp2Y + t_3 * cEndY;
                        points.push({ x, y });
                    }

                    currentX = cEndX;
                    currentY = cEndY;
                    break;

                case 'A':
                    // Arc - approximate with line segments
                    const rx = values[0];
                    const ry = values[1];
                    const xAxisRot = values[2];
                    const largeArc = values[3];
                    const sweep = values[4];
                    const x = values[5];
                    const y = values[6];

                    const arcPoints = this.approximateArc(
                        currentX, currentY, rx, ry, xAxisRot, largeArc, sweep, x, y, resolution
                    );
                    points.push(...arcPoints);

                    currentX = x;
                    currentY = y;
                    break;

                case 'Z':
                    if (currentX !== startX || currentY !== startY) {
                        points.push({ x: startX, y: startY });
                    }
                    break;
            }
        });

        return points;
    }

    /**
     * Approximate SVG arc with line segments
     */
    static approximateArc(x1, y1, rx, ry, phi, fA, fS, x2, y2, segments = 20) {
        const points = [];

        // Simple arc approximation
        const dx = x2 - x1;
        const dy = y2 - y1;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const angle = Math.PI * t * (fA ? 1 : 0.5);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            points.push({
                x: x1 + dx * t,
                y: y1 + dy * t
            });
        }

        return points;
    }

    /**
     * Parse SVG path data (simplified)
     */
    static parseSVGPath(pathString) {
        // Simple path parser - returns array of commands
        return pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
    }

    /**
     * Convert path data to DXF entities
     */
    static convertPathToDXF(pathData, dxfContent, mmToPixels) {
        // This is handled by pathToPolyline for simplicity
        // More complex conversion can be added here
    }

    /**
     * Download file to user's computer
     */
    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Download blob file
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get random color for piece (when no image is loaded)
     */
    static getRandomColor(index) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
        ];
        return colors[index % colors.length];
    }

    /**
     * Create SVG element from puzzle data (for preview)
     */
    static createSVGElement(puzzleData, imageData = null) {
        const { width, height, pieces } = puzzleData;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        // Add image pattern if image is loaded
        if (imageData) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', 'puzzleImage');
            pattern.setAttribute('x', '0');
            pattern.setAttribute('y', '0');
            pattern.setAttribute('width', '1');
            pattern.setAttribute('height', '1');

            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageData);
            image.setAttribute('width', width);
            image.setAttribute('height', height);
            image.setAttribute('preserveAspectRatio', 'xMidYMid slice');

            pattern.appendChild(image);
            defs.appendChild(pattern);
            svg.appendChild(defs);
        }

        // Add puzzle pieces
        pieces.forEach((piece, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', piece.path);
            path.setAttribute('fill', imageData ? 'url(#puzzleImage)' : this.getRandomColor(index));
            path.setAttribute('stroke', '#000000');
            path.setAttribute('stroke-width', '2');
            svg.appendChild(path);
        });

        return svg;
    }
}
