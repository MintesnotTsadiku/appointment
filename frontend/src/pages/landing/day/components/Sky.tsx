import { celestialPosition } from "../world";

/** Fixed, decorative sky: gradient, stars, sun or moon, clouds and skyline. */
const Sky = ({ hour }: { hour: number }) => {
  const orb = celestialPosition(hour);
  return (
    <div className="lw-sky" aria-hidden="true">
      <div className="lw-stars" />
      <div className="lw-orb" data-body={orb.body} style={{ left: orb.x + "%", top: orb.y + "%" }} />
      <div className="lw-cloud" style={{ top: "18%", width: 220, animationDelay: "-12s" }} />
      <div className="lw-cloud" style={{ top: "34%", width: 150, animationDelay: "-41s", animationDuration: "95s" }} />
      <div className="lw-cloud" style={{ top: "9%", width: 120, animationDelay: "-63s", animationDuration: "82s" }} />
      <Skyline />
      <div className="lw-grain" />
    </div>
  );
};

/** A loose Addis skyline: towers, a stadium curve, hills, and lit windows. */
const Skyline = () => (
  <svg className="lw-skyline" viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice">
    <path
      fill="currentColor"
      opacity="0.55"
      d="M0 150 C160 110 300 120 420 140 S700 100 860 130 1160 90 1440 125 V220 H0 Z"
    />
    <g fill="currentColor">
      {TOWERS.map(([x, width, height]) => (
        <rect key={x} x={x} y={220 - height} width={width} height={height} rx="2" />
      ))}
      <path d="M560 220 V168 Q640 140 720 168 V220 Z" />
      <rect x="1016" y="40" width="6" height="40" />
    </g>
    {WINDOWS.map(([x, y]) => (
      <rect key={x + "-" + y} className="lw-window" x={x} y={y} width="5" height="7" rx="1" />
    ))}
  </svg>
);

const TOWERS: [number, number, number][] = [
  [40, 46, 70], [96, 30, 104], [140, 60, 58], [230, 38, 126], [276, 52, 84], [360, 34, 150],
  [402, 58, 96], [480, 44, 118], [760, 50, 92], [822, 36, 140], [870, 64, 76], [950, 40, 112],
  [1000, 38, 180], [1050, 56, 100], [1130, 42, 132], [1186, 70, 72], [1270, 36, 118], [1320, 58, 90], [1392, 48, 64],
];

const WINDOWS: [number, number][] = TOWERS.flatMap(([x, width, height], tower) => {
  const lit: [number, number][] = [];
  for (let row = 0; 20 + row * 18 < height; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      if ((row + col + tower) % 3 !== 0) lit.push([x + 8 + col * (width - 21), 220 - height + 12 + row * 18]);
    }
  }
  return lit;
});

export default Sky;
