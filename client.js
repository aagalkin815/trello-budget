/* Budget Power-Up — connector */

var ICON = new URL('./icon.svg', window.location.href).href;

// spent = invoiced (all collapsed invoice lines, y:'I', across every billing
// cycle) + unbilled (individual time/expense entries). Remaining is the
// budget minus both, so invoiced work is never "given back" to the budget.
function computeTotals(cfg, log) {
  var spent = 0, invoiced = 0;
  (log || []).forEach(function (e) {
    var a = Number(e.a) || 0;
    spent += a;
    if (e.y === 'I') invoiced += a;
  });
  var budget = Number(cfg && cfg.b) || 0;
  return {
    budget: budget,
    spent: spent,
    invoiced: invoiced,
    unbilled: spent - invoiced,
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
      if (!cfg || (!cfg.o && !Number(cfg.b))) return [];
      var s = computeTotals(cfg, log);

      var badges = [];

      if (cfg.o) {
        // Open budget: purple badge showing total spend so far. Purple isn't
        // used by any budget state, so open cards stand out on the board.
        badges.push({ text: money(s.spent) + ' spent', color: 'purple' });
      } else {
        var color = 'green';
        if (s.pct >= 1) color = 'red';
        else if (s.pct >= 0.8) color = 'orange';
        else if (s.pct >= 0.5) color = 'yellow';
        badges.push({
          text: (s.remaining < 0 ? '-' : '') + money(Math.abs(s.remaining)) + ' left',
          color: color
        });
      }

      // Running total of everything invoiced so far, across all invoices.
      if (s.invoiced > 0) {
        badges.push({ text: money(s.invoiced) + ' invoiced', color: 'blue' });
      }

      return badges;
    });
  }
});
