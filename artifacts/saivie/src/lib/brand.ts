const brandTokenNames = [
    "ivory", "sage", "blush", "plum", "teal", "rose", "gold", "page",
    "surface-muted", "surface-blush", "text", "primary-action", "primary-action-text", "border",
] as const;

export function getPrintBrandStyles(): string {
    const styles = getComputedStyle(document.documentElement);
    return `:root{${brandTokenNames.map((name) => {
        const value = styles.getPropertyValue(`--saivie-${name}`).trim();
        if (!value) throw new Error(`Missing Saivie brand token: ${name}`);
        return `--saivie-${name}:${value};`;
    }).join("")}}`;
}
