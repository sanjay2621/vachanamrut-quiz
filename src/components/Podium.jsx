import { useLang } from '../i18n.js';

// Final podium of a live game: gold, silver, bronze stand out, then everyone else.
// `me` (a player's uid) highlights that player's row.
const MEDALS = ['🥇', '🥈', '🥉'];

export default function Podium({ board, me }) {
  const { t, num } = useLang();
  const top = board.slice(0, 3);
  // Visual order on the stand: silver, gold, bronze
  const stand = [top[1], top[0], top[2]].map((p, i) => ({ p, place: [2, 1, 3][i] })).filter((x) => x.p);
  return (
    <div className="podium">
      <h2>{t('livePodium')}</h2>
      <div className="podium-stand">
        {stand.map(({ p, place }) => (
          <div key={p.uid} className={`podium-col place-${place}${p.uid === me ? ' me' : ''}`}>
            <span className="podium-medal">{MEDALS[place - 1]}</span>
            <strong className="podium-name">{p.name}</strong>
            <span className="podium-score">{num(p.total)}</span>
            <div className="podium-block">{num(place)}</div>
          </div>
        ))}
      </div>
      {board.length > 3 && (
        <ol className="live-board" start={4}>
          {board.slice(3).map((p) => (
            <li key={p.uid} className={p.uid === me ? 'me' : ''}>
              <span>{p.name}</span>
              <strong>{num(p.total)}</strong>
            </li>
          ))}
        </ol>
      )}
      <p className="pv-meta">{t('livePodiumNote')}</p>
    </div>
  );
}
