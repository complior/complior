import type { ScoreZone } from '../../types/common.types.js';

const ZONE_COLORS: Record<ScoreZone, string> = {
  red: '#e05d44',
  yellow: '#dfb317',
  green: '#97ca00',
};

const LABEL = 'compliance';
const LABEL_WIDTH = 78;
const VALUE_WIDTH = 56;

export const generateBadgeSvg = (
  score: number,
  zone: ScoreZone,
  jurisdiction: string,
  date: string,
): string => {
  const color = ZONE_COLORS[zone];
  const totalWidth = LABEL_WIDTH + VALUE_WIDTH;
  const scoreText = `${Math.round(score)}%`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${LABEL}: ${scoreText}">
  <title>${LABEL}: ${scoreText} (${jurisdiction}, ${date})</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${LABEL_WIDTH}" height="20" fill="#555"/>
    <rect x="${LABEL_WIDTH}" width="${VALUE_WIDTH}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${LABEL_WIDTH / 2}" y="14">${LABEL}</text>
    <text x="${LABEL_WIDTH + VALUE_WIDTH / 2}" y="14">${scoreText}</text>
  </g>
</svg>`;
};
