import type { DeqBandUiSettingsV1 } from '../../types';

const DEQ_STEP_METADATA_PREFIX = 'sf-deq-ui-v1:';
const DEQ_STEP_METADATA_REGEX = /(?:^|\s)sf-deq-ui-v1:([^\s]+)/;
const DEQ_STEP_METADATA_TOKEN_REGEX = /(?:^|\s)sf-deq-ui-v1:[^\s]+/g;

function serializeDeqSettings(settings: DeqBandUiSettingsV1): string {
  return `${DEQ_STEP_METADATA_PREFIX}${encodeURIComponent(JSON.stringify(settings))}`;
}

export function parseDeqSettingsFromStepDescription(
  description: string | undefined,
): DeqBandUiSettingsV1 | null {
  if (!description) return null;
  const match = description.match(DEQ_STEP_METADATA_REGEX);
  if (!match) return null;

  try {
    const decoded = decodeURIComponent(match[1]!);
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<DeqBandUiSettingsV1>;
    if (candidate.version !== 1) return null;
    if (!candidate.biquad || typeof candidate.biquad !== 'object') return null;
    return candidate as DeqBandUiSettingsV1;
  } catch {
    return null;
  }
}

export function upsertDeqSettingsInStepDescription(
  description: string | undefined,
  settings: DeqBandUiSettingsV1 | null,
): string | undefined {
  const trimmed = description?.trim() ?? '';
  const withoutToken = trimmed
    .replace(DEQ_STEP_METADATA_TOKEN_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!settings) {
    return withoutToken || undefined;
  }

  const token = serializeDeqSettings(settings);
  return withoutToken ? `${withoutToken} ${token}` : token;
}

