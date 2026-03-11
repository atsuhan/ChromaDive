import { WavelengthInfo } from "@/types";

export const MAX_DEPTH = 200;

export const WAVELENGTH_DATA: WavelengthInfo[] = [
  { name: "Violet",       nameJa: "紫",     wavelength: 400, color: [127,   0, 255], absorptionCoefficient: 0.02 },
  { name: "Blue-Violet",  nameJa: "青紫",   wavelength: 430, color: [ 72,   0, 255], absorptionCoefficient: 0.018 },
  { name: "Blue",         nameJa: "青",     wavelength: 470, color: [  0,  70, 255], absorptionCoefficient: 0.015 },
  { name: "Cyan",         nameJa: "シアン",  wavelength: 490, color: [  0, 150, 255], absorptionCoefficient: 0.016 },
  { name: "Teal",         nameJa: "青緑",   wavelength: 510, color: [  0, 200, 180], absorptionCoefficient: 0.018 },
  { name: "Green",        nameJa: "緑",     wavelength: 530, color: [  0, 210,   0], absorptionCoefficient: 0.02 },
  { name: "Yellow-Green", nameJa: "黄緑",   wavelength: 555, color: [128, 210,   0], absorptionCoefficient: 0.035 },
  { name: "Yellow",       nameJa: "黄",     wavelength: 570, color: [230, 220,   0], absorptionCoefficient: 0.05 },
  { name: "Amber",        nameJa: "琥珀",   wavelength: 585, color: [255, 190,   0], absorptionCoefficient: 0.065 },
  { name: "Orange",       nameJa: "橙",     wavelength: 600, color: [255, 130,   0], absorptionCoefficient: 0.08 },
  { name: "Red-Orange",   nameJa: "朱色",   wavelength: 630, color: [255,  60,   0], absorptionCoefficient: 0.15 },
  { name: "Red",          nameJa: "赤",     wavelength: 700, color: [255,   0,   0], absorptionCoefficient: 0.3 },
];
