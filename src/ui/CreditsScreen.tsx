import { SOURCES } from '../content/sources';
import { ASSETS } from '../content/assets';
import { useGame, useT } from '../game/store';

export function CreditsScreen() {
  const t = useT();
  const setView = useGame((s) => s.setView);
  return (
    <main className="home scroll" id="main">
      <section className="hero">
        <span className="eyebrow">{t('Sources & credits')}</span>
        <h1 style={{ fontSize: 34, marginTop: 8 }}>{t('Where every fact and image comes from')}</h1>
        <p className="tagline">{t('LEGACY is an independent educational project for NASA Space Apps Challenge 2026 and is not an official NASA product. No NASA insignia is used and no endorsement is implied.')}</p>
      </section>
      <div className="home-lower" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <section className="panel panel-pad stack" aria-labelledby="img-credits">
          <h3 id="img-credits">{t('Images and textures')}</h3>
          {ASSETS.map((a) => (
            <div key={a.file} className="stack-sm small" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
              <strong>{a.title}</strong>
              <span className="muted">
                {t('Credit')}: {a.credit} · {a.license}
                {a.modified ? ` · ${a.modified}` : ''}
              </span>
              <a href={a.url} target="_blank" rel="noreferrer noopener" className="tiny">
                {a.url} ↗
              </a>
            </div>
          ))}
          <h3>{t('Created for LEGACY')}</h3>
          <p className="small muted">{t('3D rover, launchers, satellites and terrain are procedural reconstructions made in code. Sound effects are synthesized in the browser. Narration uses your browser\'s synthetic voice. Fonts: Space Grotesk, Inter and IBM Plex Sans Arabic (SIL Open Font License).')} {t('3D engine: Three.js (MIT License).')}</p>
        </section>
        <section className="panel panel-pad stack" aria-labelledby="src-credits">
          <h3 id="src-credits">{t('Facts and references')}</h3>
          {SOURCES.filter((s) => !s.url.startsWith('#')).map((s) => (
            <div key={s.id} className="stack-sm small" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
              <strong>{t(s.title)}</strong>
              <span className="muted">{s.credit}</span>
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="tiny">
                {s.url} ↗
              </a>
            </div>
          ))}
        </section>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => setView('home')}>
          {t('Back to Mission Control')}
        </button>
      </div>
    </main>
  );
}
