import { useState } from 'react';
import { assetCredit } from '../content/assets';
import { asset } from '../scenes/models';
import { useT } from '../game/store';

/** NASA image with its credit line shown at the point of use. */
export function Figure({ file, alt, maxHeight }: { file: string; alt: string; maxHeight?: number }) {
  const [failed, setFailed] = useState(false);
  const t = useT();
  const c = assetCredit(file);
  if (failed) return null;
  return (
    <figure className="img-card" style={{ margin: 0 }}>
      <img src={asset(file)} alt={alt} loading="lazy" style={maxHeight ? { maxHeight } : undefined} onError={() => setFailed(true)} />
      {c && (
        <figcaption className="cap">
          {t('Image')}: {c.credit} ·{' '}
          <a href={c.url} target="_blank" rel="noreferrer noopener">
            {c.title} ↗
          </a>
        </figcaption>
      )}
    </figure>
  );
}
