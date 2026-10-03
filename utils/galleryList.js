const fs = require('fs');
const path = require('path');

const IMAGE_PATTERN = /\.(jpe?g|png|gif|webp)$/i;

function resolveGalleryDir(publicRoot) {
    const imageBase = path.join(publicRoot, 'image');

    if (fs.existsSync(imageBase)) {
        const folder = fs.readdirSync(imageBase, { withFileTypes: true })
            .find((entry) => entry.isDirectory() && entry.name.toLowerCase() === 'galeria');

        if (folder) {
            return {
                dir: path.join(imageBase, folder.name),
                urlPrefix: `/image/${folder.name}`
            };
        }
    }

    return null;
}

function resolveGallerySources(publicRoot) {
    const found = resolveGalleryDir(publicRoot);
    return found ? [found] : [];
}

/** Lista APENAS imagens da pasta public/image/Galeria */
function listGalleryImages(publicRoot) {
    const found = resolveGalleryDir(publicRoot);
    if (!found) return [];

    const { dir, urlPrefix } = found;

    return fs.readdirSync(dir)
        .filter((file) => IMAGE_PATTERN.test(file))
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
        .map((file) => {
            const filePath = path.join(dir, file);
            const updated = fs.statSync(filePath).mtimeMs;
            return `${urlPrefix}/${encodeURIComponent(file)}?v=${Math.floor(updated)}`;
        });
}

module.exports = {
    listGalleryImages,
    resolveGalleryDir,
    resolveGallerySources
};
