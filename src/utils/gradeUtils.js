export const scoreToLetter = (score) => {
    if (score === null || score === undefined || Number.isNaN(score)) return null;
    if (score >= 91) return "A";
    if (score >= 76) return "B";
    if (score >= 61) return "C";
    if (score >= 41) return "D";
    if (score >= 21) return "E";
    return "F";
};

export const letterToColor = (letter) => {
    if (!letter) return "#6b7280";
    if (letter === "A") return "#10b981"; // vert
    if (letter === "B") return "#84cc16"; // vert lime
    if (letter === "C") return "#f59e0b"; // orange
    if (letter === "D") return "#f59e0b"; // orange (même couleur que C)
    if (letter === "E") return "#ef4444"; // rouge
    return "#ef4444"; // rouge (même couleur que E)
};

export const letterToLabel = (letter) => {
    if (!letter) return "N/A";
    switch (letter) {
        case "A":
            return "Excellent";
        case "B":
            return "Bon";
        case "C":
            return "Moyen";
        case "D":
            return "Faible";
        case "E":
            return "Insuffisant";
        default:
            return "Critique";
    }
};

const LETTER_BACKGROUND = {
    // Couleurs de fond plus franches (sans opacité) pour les badges / nœuds
    A: "#10b981", // vert
    B: "#84cc16", // vert lime
    C: "#f59e0b", // orange
    D: "#f59e0b", // orange (même couleur que C)
    E: "#ef4444", // rouge
    F: "#ef4444"  // rouge (même couleur que E)
};

export const letterToBackground = (letter) => LETTER_BACKGROUND[letter] || "#9ca3af";

export const scoreToColor = (score) => letterToColor(scoreToLetter(score));

export const scoreToLabel = (score) => letterToLabel(scoreToLetter(score));

export const letterToScore = (letter) => {
    if (!letter) return null;
    const mapping = {
        A: 95,
        B: 83,
        C: 70,
        D: 55,
        E: 35,
        F: 15
    };
    return mapping[letter] ?? null;
};

export const percentageToLetter = (value, higherIsBetter = true) => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(numeric)) return null;
    const clamped = Math.max(0, Math.min(100, numeric));
    const normalized = higherIsBetter ? clamped : 100 - clamped;
    return scoreToLetter(normalized);
};

export const percentageToColor = (value, higherIsBetter = true) => letterToColor(percentageToLetter(value, higherIsBetter));

