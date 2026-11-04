(function () {
  const lantern = (x, len, s) => `
    <g transform="translate(${x} 0)">
      <line x1="0" y1="0" x2="0" y2="${len}" stroke="#23324a" stroke-width="2"/>
      <g transform="translate(0 ${len}) scale(${s})">
        <rect x="-9" y="0" width="18" height="7" rx="2" fill="#d2a03a" stroke="#23324a" stroke-width="2"/>
        <ellipse cx="0" cy="30" rx="26" ry="24" fill="#c9483d" stroke="#23324a" stroke-width="2"/>
        <path d="M-13 9 Q-20 30 -13 51 M0 6 V54 M13 9 Q20 30 13 51" fill="none" stroke="#23324a" stroke-width="1.5" opacity=".55"/>
        <rect x="-9" y="52" width="18" height="7" rx="2" fill="#d2a03a" stroke="#23324a" stroke-width="2"/>
        <path d="M-4 59 L-6 78 M0 59 V80 M4 59 L6 78" stroke="#d2a03a" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </g>`;

  const flower = (x, y, r) => {
    let petals = "";
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      petals += `<circle cx="${(x + Math.cos(a) * r * .9).toFixed(1)}" cy="${(y + Math.sin(a) * r * .9).toFixed(1)}" r="${r * .7}" fill="#f2b8c0" stroke="#23324a" stroke-width="1.2"/>`;
    }
    return petals + `<circle cx="${x}" cy="${y}" r="${r * .35}" fill="#c9483d"/>`;
  };

  const lanternsSvg = `<svg class="decor lanterns" viewBox="0 0 120 170" aria-hidden="true">${lantern(30, 40, .9)}${lantern(88, 70, .7)}</svg>`;

  const sakuraSvg = `<svg class="decor sakura" viewBox="0 0 260 150" aria-hidden="true">
    <path d="M-10 18 C60 30 110 40 175 85 M70 32 C95 55 100 80 95 110 M130 52 C150 40 175 30 205 32"
      fill="none" stroke="#23324a" stroke-width="3" stroke-linecap="round"/>
    ${flower(176, 86, 9)}${flower(96, 110, 8)}${flower(206, 32, 8)}${flower(140, 66, 6)}${flower(60, 28, 6)}${flower(84, 62, 5)}
  </svg>`;

  document.body.insertAdjacentHTML("afterbegin", sakuraSvg + lanternsSvg);
})();
