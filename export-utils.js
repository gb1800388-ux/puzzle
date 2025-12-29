/**
 * Export Utilities - SVG, PNG, and DXF export functionality
 * Optimized for print and CNC cutting (RDWorks, LaserCut)
 */

class ExportUtils {
    static MM_TO_PIXELS = 3.7795275591; // 96 DPI

    /**
     * Export puzzle as SVG with image
     */
    static exportSVG(puzzleData, imageData = null, options = {}) {
        const { width, height, pieces, borderPath, lineWidth = 1.5, form } = puzzleData;
        const { includeImage = true, strokeColor = '#000000', strokeWidth = lineWidth } = options;

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
`;

        // Add defs for clipping and patterns
        svg += '    <defs>\n';

        // Create clip path from border
        if (borderPath) {
            svg += `        <clipPath id="puzzleClip">
            <path d="${borderPath}"/>
        </clipPath>\n`;
        }

        // Add image pattern if image is loaded
        if (includeImage && imageData) {
            svg += `        <pattern id="puzzleImage" x="0" y="0" width="1" height="1" patternContentUnits="objectBoundingBox">
            <image xlink:href="${imageData}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/>
        </pattern>\n`;
        }

        svg += '    </defs>\n';

        // Background with image (clipped to puzzle shape)
        if (includeImage && imageData) {
            if (form === 'circular' && puzzleData.centerX) {
                svg += `    <circle cx="${puzzleData.centerX}" cy="${puzzleData.centerY}" r="${puzzleData.radius}" fill="url(#puzzleImage)"/>\n`;
            } else if (borderPath) {
                svg += `    <path d="${borderPath}" fill="url(#puzzleImage)"/>\n`;
            }
        }

        // Draw all piece edges
        svg += '    <g id="puzzle-cuts" fill="none" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '">\n';

        pieces.forEach((piece, index) => {
            svg += `        <path d="${piece.path}"/>\n`;
        });

        // Draw outer border
        if (borderPath) {
            svg += `        <path d="${borderPath}" stroke-width="${strokeWidth * 1.5}"/>\n`;
        }

        svg += '    </g>\n';
        svg += '</svg>';

        return svg;
    }

    /**
     * Export puzzle as SVG - cut lines only (for CNC)
     */
    static exportSVGCutLines(puzzleData) {
        return this.exportSVG(puzzleData, null, {
            includeImage: false,
            strokeColor: '#FF0000',
            strokeWidth: puzzleData.lineWidth || 0.5
        });
    }

    /**
     * Export puzzle as PNG with image (for printing)
     */
    static async exportPNG(puzzleData, imageData = null, scale = 3) {
        return new Promise((resolve, reject) => {
            const svg = this.exportSVG(puzzleData, imageData, { includeImage: true });
            this.svgToPNG(svg, puzzleData.width, puzzleData.height, scale)
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Export puzzle as PNG - cut lines only
     */
    static async exportPNGCutLines(puzzleData, scale = 3) {
        return new Promise((resolve, reject) => {
            const { width, height, pieces, borderPath, lineWidth = 1.5 } = puzzleData;

            // Create simple SVG with just cut lines
            let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="white"/>
    <g fill="none" stroke="#000000" stroke-width="${lineWidth}">
`;
            pieces.forEach(piece => {
                svg += `        <path d="${piece.path}"/>\n`;
            });

            if (borderPath) {
                svg += `        <path d="${borderPath}" stroke-width="${lineWidth * 1.5}"/>\n`;
            }

            svg += '    </g>\n</svg>';

            this.svgToPNG(svg, width, height, scale)
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Convert SVG to PNG blob
     */
    static async svgToPNG(svgString, width, height, scale = 2) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width * scale;
                canvas.height = height * scale;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                }, 'image/png', 1.0);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG for PNG conversion'));
            };

            img.src = url;
        });
    }

    /**
     * Export puzzle as DXF for CNC (RDWorks compatible)
     */
    static exportDXF(puzzleData) {
        const { width, height, pieces, borderPath, form } = puzzleData;
        const widthMM = width / this.MM_TO_PIXELS;
        const heightMM = height / this.MM_TO_PIXELS;

        let dxf = '';

        // DXF Header section
        dxf += '0\nSECTION\n2\nHEADER\n';
        dxf += '9\n$ACADVER\n1\nAC1015\n';
        dxf += '9\n$INSUNITS\n70\n4\n'; // mm
        dxf += '9\n$EXTMIN\n10\n0.0\n20\n0.0\n30\n0.0\n';
        dxf += `9\n$EXTMAX\n10\n${widthMM.toFixed(4)}\n20\n${heightMM.toFixed(4)}\n30\n0.0\n`;
        dxf += '0\nENDSEC\n';

        // Tables section
        dxf += '0\nSECTION\n2\nTABLES\n';

        // Line type table
        dxf += '0\nTABLE\n2\nLTYPE\n70\n1\n';
        dxf += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
        dxf += '0\nENDTAB\n';

        // Layer table
        dxf += '0\nTABLE\n2\nLAYER\n70\n2\n';
        dxf += '0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n'; // Red for cutting
        dxf += '0\nLAYER\n2\nBORDER\n70\n0\n62\n5\n6\nCONTINUOUS\n'; // Blue for border
        dxf += '0\nENDTAB\n';

        dxf += '0\nENDSEC\n';

        // Entities section
        dxf += '0\nSECTION\n2\nENTITIES\n';

        // Convert all puzzle pieces to DXF polylines
        pieces.forEach((piece) => {
            dxf += this.pathToPolyline(piece.path, 'CUT', heightMM);
        });

        // Convert border
        if (borderPath) {
            dxf += this.pathToPolyline(borderPath, 'BORDER', heightMM);
        }

        dxf += '0\nENDSEC\n';
        dxf += '0\nEOF\n';

        return dxf;
    }

    /**
     * Convert SVG path to DXF LWPOLYLINE
     */
    static pathToPolyline(pathString, layer, heightMM) {
        const points = this.getPathPoints(pathString);

        if (points.length < 2) return '';

        let dxf = '0\nLWPOLYLINE\n';
        dxf += '100\nAcDbEntity\n';
        dxf += `8\n${layer}\n`;
        dxf += '100\nAcDbPolyline\n';
        dxf += `90\n${points.length}\n`;
        dxf += '70\n1\n'; // Closed polyline

        points.forEach(point => {
            const xMM = point.x / this.MM_TO_PIXELS;
            // Flip Y coordinate (DXF uses bottom-left origin)
            const yMM = heightMM - (point.y / this.MM_TO_PIXELS);
            dxf += `10\n${xMM.toFixed(4)}\n`;
            dxf += `20\n${yMM.toFixed(4)}\n`;
        });

        return dxf;
    }

    /**
     * Extract points from SVG path with curve approximation
     */
    static getPathPoints(pathString, resolution = 16) {
        const points = [];
        const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];

        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        commands.forEach(cmd => {
            const type = cmd[0].toUpperCase();
            const values = cmd.slice(1).trim().split(/[\s,]+/).filter(v => v).map(parseFloat);

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

                case 'H':
                    currentX = values[0];
                    points.push({ x: currentX, y: currentY });
                    break;

                case 'V':
                    currentY = values[0];
                    points.push({ x: currentX, y: currentY });
                    break;

                case 'C':
                    // Cubic bezier
                    const cp1x = values[0], cp1y = values[1];
                    const cp2x = values[2], cp2y = values[3];
                    const endX = values[4], endY = values[5];

                    for (let i = 1; i <= resolution; i++) {
                        const t = i / resolution;
                        const t2 = t * t;
                        const t3 = t2 * t;
                        const mt = 1 - t;
                        const mt2 = mt * mt;
                        const mt3 = mt2 * mt;

                        const x = mt3 * currentX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * endX;
                        const y = mt3 * currentY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * endY;
                        points.push({ x, y });
                    }

                    currentX = endX;
                    currentY = endY;
                    break;

                case 'Q':
                    // Quadratic bezier
                    const qcpX = values[0], qcpY = values[1];
                    const qendX = values[2], qendY = values[3];

                    for (let i = 1; i <= resolution; i++) {
                        const t = i / resolution;
                        const t1 = 1 - t;
                        const x = t1 * t1 * currentX + 2 * t1 * t * qcpX + t * t * qendX;
                        const y = t1 * t1 * currentY + 2 * t1 * t * qcpY + t * t * qendY;
                        points.push({ x, y });
                    }

                    currentX = qendX;
                    currentY = qendY;
                    break;

                case 'A':
                    // Arc - approximate with lines
                    const rx = values[0], ry = values[1];
                    const rotation = values[2];
                    const largeArc = values[3];
                    const sweep = values[4];
                    const ax = values[5], ay = values[6];

                    const arcPoints = this.approximateArc(
                        currentX, currentY, rx, ry, rotation, largeArc, sweep, ax, ay, resolution
                    );
                    points.push(...arcPoints);

                    currentX = ax;
                    currentY = ay;
                    break;

                case 'Z':
                    // Close path - don't add duplicate point if already at start
                    if (Math.abs(currentX - startX) > 0.01 || Math.abs(currentY - startY) > 0.01) {
                        points.push({ x: startX, y: startY });
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        });

        return points;
    }

    /**
     * Approximate SVG elliptical arc with line segments
     */
    static approximateArc(x1, y1, rx, ry, phi, fA, fS, x2, y2, segments = 16) {
        const points = [];

        // Handle degenerate cases
        if (rx === 0 || ry === 0) {
            points.push({ x: x2, y: y2 });
            return points;
        }

        // Convert to center parameterization
        const phiRad = (phi * Math.PI) / 180;
        const cosPhi = Math.cos(phiRad);
        const sinPhi = Math.sin(phiRad);

        const dx = (x1 - x2) / 2;
        const dy = (y1 - y2) / 2;

        const x1p = cosPhi * dx + sinPhi * dy;
        const y1p = -sinPhi * dx + cosPhi * dy;

        let rxSq = rx * rx;
        let rySq = ry * ry;
        const x1pSq = x1p * x1p;
        const y1pSq = y1p * y1p;

        // Correct radii
        const lambda = x1pSq / rxSq + y1pSq / rySq;
        if (lambda > 1) {
            const sqrtLambda = Math.sqrt(lambda);
            rx *= sqrtLambda;
            ry *= sqrtLambda;
            rxSq = rx * rx;
            rySq = ry * ry;
        }

        // Compute center
        let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
        sq = Math.max(0, sq);
        const coef = (fA !== fS ? 1 : -1) * Math.sqrt(sq);

        const cxp = coef * ((rx * y1p) / ry);
        const cyp = coef * (-(ry * x1p) / rx);

        const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
        const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

        // Compute angles
        const ux = (x1p - cxp) / rx;
        const uy = (y1p - cyp) / ry;
        const vx = (-x1p - cxp) / rx;
        const vy = (-y1p - cyp) / ry;

        const n = Math.sqrt(ux * ux + uy * uy);
        let p = ux;
        let theta1 = (uy < 0 ? -1 : 1) * Math.acos(p / n);

        p = ux * vx + uy * vy;
        const nn = Math.sqrt(vx * vx + vy * vy);
        let dTheta = (ux * vy - uy * vx < 0 ? -1 : 1) * Math.acos(p / (n * nn));

        if (!fS && dTheta > 0) {
            dTheta -= 2 * Math.PI;
        } else if (fS && dTheta < 0) {
            dTheta += 2 * Math.PI;
        }

        // Generate points
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const angle = theta1 + dTheta * t;

            const xr = rx * Math.cos(angle);
            const yr = ry * Math.sin(angle);

            const x = cosPhi * xr - sinPhi * yr + cx;
            const y = sinPhi * xr + cosPhi * yr + cy;

            points.push({ x, y });
        }

        return points;
    }

    /**
     * Download file to user's computer
     */
    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        this.downloadBlob(blob, filename);
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
     * Create SVG element for preview (DOM element, not string)
     */
    static createSVGPreview(puzzleData, imageData = null) {
        const { width, height, pieces, borderPath, lineWidth = 1.5, form } = puzzleData;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // Create clip path
        if (borderPath) {
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipPath.setAttribute('id', 'previewClip');
            const clipPathPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            clipPathPath.setAttribute('d', borderPath);
            clipPath.appendChild(clipPathPath);
            defs.appendChild(clipPath);
        }

        // Create pattern for image
        if (imageData) {
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', 'previewImage');
            pattern.setAttribute('x', '0');
            pattern.setAttribute('y', '0');
            pattern.setAttribute('width', '1');
            pattern.setAttribute('height', '1');
            pattern.setAttribute('patternContentUnits', 'objectBoundingBox');

            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageData);
            image.setAttribute('width', '1');
            image.setAttribute('height', '1');
            image.setAttribute('preserveAspectRatio', 'xMidYMid slice');

            pattern.appendChild(image);
            defs.appendChild(pattern);
        }

        svg.appendChild(defs);

        // Background with image
        if (imageData) {
            if (form === 'circular' && puzzleData.centerX) {
                const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                bgCircle.setAttribute('cx', puzzleData.centerX);
                bgCircle.setAttribute('cy', puzzleData.centerY);
                bgCircle.setAttribute('r', puzzleData.radius);
                bgCircle.setAttribute('fill', 'url(#previewImage)');
                svg.appendChild(bgCircle);
            } else if (borderPath) {
                const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                bgPath.setAttribute('d', borderPath);
                bgPath.setAttribute('fill', 'url(#previewImage)');
                svg.appendChild(bgPath);
            }
        } else {
            // Light gray background when no image
            if (form === 'circular' && puzzleData.centerX) {
                const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                bgCircle.setAttribute('cx', puzzleData.centerX);
                bgCircle.setAttribute('cy', puzzleData.centerY);
                bgCircle.setAttribute('r', puzzleData.radius);
                bgCircle.setAttribute('fill', '#f0f0f0');
                svg.appendChild(bgCircle);
            } else if (borderPath) {
                const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                bgPath.setAttribute('d', borderPath);
                bgPath.setAttribute('fill', '#f0f0f0');
                svg.appendChild(bgPath);
            }
        }

        // Draw puzzle pieces
        const cutsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        cutsGroup.setAttribute('fill', 'none');
        cutsGroup.setAttribute('stroke', '#333333');
        cutsGroup.setAttribute('stroke-width', lineWidth.toString());

        pieces.forEach(piece => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', piece.path);
            cutsGroup.appendChild(path);
        });

        svg.appendChild(cutsGroup);

        // Draw border
        if (borderPath) {
            const border = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            border.setAttribute('d', borderPath);
            border.setAttribute('fill', 'none');
            border.setAttribute('stroke', '#000000');
            border.setAttribute('stroke-width', (lineWidth * 2).toString());
            svg.appendChild(border);
        }

        return svg;
    }
}

// Make globally available
window.ExportUtils = ExportUtils;
