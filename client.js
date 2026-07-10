/* Budget Power-Up — connector */

var ICON = new URL('./icon.svg', window.location.href).href;

function computeTotals(cfg, log) {
  var spent = 0;
  (log || []).forEach(function (e) { spent += Number(e.a) || 0; });
  var budget = Number(cfg && cfg.b) || 0;
  return {
    budget: budget,
    spent: spent,
    remaining: budget - spent,
    pct: budget > 0 ? spent / budget : 0
  };
}

function money(n) {
  return '$' + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

window.TrelloPowerUp.initialize({

  // The main UI: a "Budget" section on the back of every card.
  'card-back-section': function (t) {
    return {
      title: 'Budget',
      icon: ICON,
      content: {
        type: 'iframe',
        url: t.signUrl('./section.html'),
        height: 260
      }
    };
  },

  // Card-front badge: remaining budget, color-coded like the meter.
  'card-badges': function (t) {
    return Promise.all([
      t.get('card', 'shared', 'cfg'),
      t.get('card', 'shared', 'log')
    ]).then(function (res) {
      var cfg = res[0], log = res[1];
      if (!cfg || !Number(cfg.b)) return [];
      var s = computeTotals(cfg, log);
      var color = 'green';
      if (s.pct >= 1) color = 'red';
      else if (s.pct >= 0.8) color = 'orange';
      else if (s.pct >= 0.5) color = 'yellow';
      return [{
        text: (s.remaining < 0 ? '-' : '') + money(Math.abs(s.remaining)) + ' left',
        color: color
      }];
    });
  }
});
