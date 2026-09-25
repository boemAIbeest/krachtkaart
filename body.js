// Faceted body figure. Left halves are drawn by hand in a 200x460 box and mirrored at x = 100.
(function (root) {
  const SIL = [[100, 12], [89, 15], [81, 25], [79, 40], [82, 52], [88, 61], [89, 70], [76, 76], [62, 79], [52, 83],
    [45, 92], [41, 110], [36, 138], [32, 166], [26, 200], [21, 236], [18, 254], [22, 268], [30, 270], [35, 256],
    [38, 238], [45, 202], [51, 170], [56, 145], [62, 124], [66, 150], [69, 184], [70, 208], [65, 232], [62, 268],
    [67, 308], [73, 334], [72, 352], [70, 380], [74, 418], [77, 432], [70, 442], [72, 448], [92, 448], [92, 432],
    [91, 418], [93, 380], [93, 350], [93, 334], [96, 300], [97, 256], [100, 246]];

  const FOREARM = [[38, 170], [49, 172], [45, 190], [39, 224], [31, 232], [29, 212], [33, 190]];
  const UPPER_ARM = [[56, 114], [48, 122], [42, 142], [39, 160], [48, 164], [53, 146], [58, 126]];

  const VIEWS = {
    voor: {
      trapezius: [[[88, 60], [89, 71], [74, 77], [82, 68]]],
      schouders: [[[72, 79], [60, 80], [52, 86], [47, 97], [44, 114], [50, 118], [55, 104], [63, 92], [74, 84]]],
      borst: [[[98, 84], [78, 85], [67, 94], [62, 110], [68, 125], [84, 131], [98, 128]]],
      biceps: [UPPER_ARM],
      onderarmen: [FOREARM],
      buik: [[[98, 134], [87, 133], [85, 152], [98, 153]], [[98, 157], [85, 156], [85, 175], [98, 176]],
        [[98, 180], [85, 179], [87, 198], [98, 206]]],
      schuine: [[[82, 134], [70, 129], [68, 150], [70, 180], [75, 204], [83, 199], [82, 176]]],
      quadriceps: [[[70, 222], [84, 226], [90, 244], [90, 284], [88, 318], [82, 330], [75, 328], [69, 300], [65, 262]]],
      adductoren: [[[92, 236], [97, 248], [95, 268], [93, 296], [92, 262]]],
      kuiten: [[[76, 348], [88, 348], [90, 370], [87, 404], [81, 418], [75, 398], [73, 370]]],
    },
    achter: {
      trapezius: [[[88, 60], [98, 64], [98, 128], [89, 114], [77, 86], [70, 79], [86, 70]]],
      schouders: [[[68, 80], [58, 81], [52, 86], [47, 97], [44, 114], [50, 118], [56, 104], [64, 92], [74, 86]]],
      triceps: [UPPER_ARM],
      onderarmen: [FOREARM],
      rug: [[[86, 118], [76, 94], [66, 104], [64, 128], [69, 160], [78, 188], [90, 178], [96, 152], [96, 134]]],
      onderrug: [[[98, 156], [96, 172], [90, 192], [88, 214], [98, 216]]],
      billen: [[[98, 220], [86, 216], [72, 220], [66, 238], [68, 258], [82, 266], [94, 262], [98, 244]]],
      hamstrings: [[[68, 270], [84, 274], [94, 272], [94, 300], [90, 326], [80, 330], [72, 324], [68, 296]]],
      kuiten: [[[74, 346], [90, 346], [92, 368], [88, 398], [82, 412], [74, 396], [72, 368]]],
    },
  };

  const mirror = (pts) => pts.map(([x, y]) => [200 - x, y]);
  const d = (pts) => 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';
  const NS = 'http://www.w3.org/2000/svg';

  function render(svg, view) {
    svg.setAttribute('viewBox', '0 0 200 460');
    svg.replaceChildren();
    const skin = document.createElementNS(NS, 'path');
    skin.setAttribute('class', 'skin');
    skin.setAttribute('d', d([...SIL, ...mirror(SIL).reverse()]));
    svg.append(skin);
    for (const [id, polys] of Object.entries(VIEWS[view])) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'm');
      p.setAttribute('d', polys.flatMap((poly) => [d(poly), d(mirror(poly))]).join(''));
      p.setAttribute('tabindex', '0');
      p.setAttribute('role', 'button');
      p.setAttribute('aria-label', root.Score.MUSCLES[id]);
      p.dataset.m = id;
      // Load animation runs feet first, like plates going onto a bar from the floor up.
      const lowest = Math.max(...polys.flat().map(([, y]) => y));
      p.style.setProperty('--d', Math.round((460 - lowest) * 1.6) + 'ms');
      svg.append(p);
    }
  }

  root.Body = { render };
})(window);
