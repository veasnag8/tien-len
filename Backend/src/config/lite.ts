export function isLiteMode(): boolean {
  return process.env.LITE_MODE === 'true' || process.env.LITE_MODE === '1';
}
