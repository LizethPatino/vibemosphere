import * as exifr from 'exifr';

const CAMERA_HINT_PATTERNS = [
  /apple/i,
  /iphone/i,
  /ipad/i,
  /samsung/i,
  /galaxy/i,
  /google/i,
  /pixel/i,
  /canon/i,
  /nikon/i,
  /sony/i,
  /fujifilm/i,
  /\bfuji\b/i,
  /panasonic/i,
  /lumix/i,
  /olympus/i,
  /om system/i,
  /leica/i,
  /huawei/i,
  /xiaomi/i,
  /redmi/i,
  /poco/i,
  /oneplus/i,
  /oppo/i,
  /vivo/i,
  /motorola/i,
  /\bmoto\b/i,
  /dji/i,
  /gopro/i,
  /hasselblad/i,
  /pentax/i,
  /ricoh/i,
  /kodak/i,
];

const CREATIVE_SOFTWARE_PATTERNS = [
  /photoshop/i,
  /procreate/i,
  /clip studio/i,
  /clipstudio/i,
  /krita/i,
  /illustrator/i,
  /figma/i,
  /fresco/i,
  /adobe fresco/i,
  /affinity/i,
  /rebelle/i,
  /corel painter/i,
];

const CAMERA_METADATA_MESSAGE =
  'This file is still carrying camera metadata, so it reads more like a captured photo than a digital illustration. A clean export will let the drawing speak for itself.';

type ParsedExif = {
  Make?: string;
  Model?: string;
  Software?: string;
} | null;

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function validateIllustrationExif(file: File): Promise<string | null> {
  let metadata: ParsedExif = null;

  try {
    metadata = (await exifr.parse(file, ['Make', 'Model', 'Software'])) as ParsedExif;
  } catch {
    return null;
  }

  const make = normalizeValue(metadata?.Make);
  const model = normalizeValue(metadata?.Model);
  const software = normalizeValue(metadata?.Software);
  const cameraFingerprint = `${make} ${model}`.trim();

  if (!cameraFingerprint) {
    return null;
  }

  const hasKnownCameraSource = CAMERA_HINT_PATTERNS.some((pattern) =>
    pattern.test(cameraFingerprint)
  );

  if (!hasKnownCameraSource) {
    return null;
  }

  const hasCreativeSoftware = CREATIVE_SOFTWARE_PATTERNS.some((pattern) =>
    pattern.test(software)
  );

  return hasCreativeSoftware ? CAMERA_METADATA_MESSAGE : CAMERA_METADATA_MESSAGE;
}
