export function getShortName(name = '') {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];

    return `${parts[0]} ${parts[1]}`;
}

export function getUserInitials(name = '') {
    const shortName = getShortName(name);
    const parts = shortName.split(/\s+/).filter(Boolean);

    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
