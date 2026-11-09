const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const monthRoman = (month) => ROMAN_MONTHS[Number(month) - 1] || '';
export const formatSequence = (seq, minimumWidth = 3) => String(Math.max(0, Number(seq) || 0)).padStart(minimumWidth, '0');
