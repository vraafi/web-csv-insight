(function () {
  'use strict';

  var fileInput = document.getElementById('fileInput');
  var btnSample = document.getElementById('btnSample');
  var btnClear = document.getElementById('btnClear');
  var statusEl = document.getElementById('status');
  var summaryEl = document.getElementById('summary');
  var chartSelect = document.getElementById('chartSelect');
  var canvas = document.getElementById('chart');
  var chartInfo = document.getElementById('chartInfo');

  var state = {
    rows: [],
    headers: []
  };

  var SAMPLE_CSV = 'nama,usia,kota,skor\nAndi,25,Jakarta,88\nBudi,32,Bandung,75\nCitra,28,Jakarta,92\nDewi,41,Surabaya,67\nEko,35,Bandung,81\nFajar,29,Jakarta,79\nGita,38,Surabaya,85\nHani,24,Bandung,90\nIndra,45,Jakarta,72\nJoko,33,Surabaya,64\nKarin,27,Bandung,95\nLaras,31,Jakarta,83';

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    while (i < len) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== '') {
      rows.push(row);
    }
    return rows;
  }

  function normalize(rows) {
    if (!rows.length) return { headers: [], data: [] };
    var headers = rows[0].map(function (h, idx) {
      var t = String(h).trim();
      return t === '' ? 'Kolom ' + (idx + 1) : t;
    });
    var data = [];
    for (var r = 1; r < rows.length; r++) {
      var cells = rows[r];
      if (cells.length === 1 && cells[0].trim() === '') continue;
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = cells[c] !== undefined ? cells[c] : '';
      }
      data.push(obj);
    }
    return { headers: headers, data: data };
  }

  function isNumericValue(v) {
    if (v === null || v === undefined) return false;
    var s = String(v).trim();
    if (s === '') return false;
    return /^-?\d+(\.\d+)?$/.test(s);
  }

  function computeStats(headers, data) {
    return headers.map(function (h) {
      var values = data.map(function (row) { return row[h]; });
      var nonEmpty = values.filter(function (v) { return String(v).trim() !== ''; });
      var numeric = nonEmpty.filter(isNumericValue).map(Number);
      var isNumeric = nonEmpty.length > 0 && numeric.length === nonEmpty.length;
      var out = {
        name: h,
        count: nonEmpty.length,
        missing: values.length - nonEmpty.length,
        numeric: isNumeric
      };
      if (isNumeric) {
        numeric.sort(function (a, b) { return a - b; });
        var sum = numeric.reduce(function (a, b) { return a + b; }, 0);
        var mean = sum / numeric.length;
        var n = numeric.length;
        var median = n % 2 === 1 ? numeric[(n - 1) / 2] : (numeric[n / 2 - 1] + numeric[n / 2]) / 2;
        var min = numeric[0];
        var max = numeric[n - 1];
        out.mean = mean;
        out.median = median;
        out.min = min;
        out.max = max;
        out.sorted = numeric;
      } else {
        var freq = {};
        nonEmpty.forEach(function (v) {
          var key = String(v);
          freq[key] = (freq[key] || 0) + 1;
        });
        var uniq = Object.keys(freq).length;
        out.unique = uniq;
        out.freq = freq;
        var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
        out.top = top.slice(0, 8).map(function (k) { return { label: k, count: freq[k] }; });
      }
      return out;
    });
  }

  function fmtNum(n) {
    if (!isFinite(n)) return '-';
    if (Math.abs(n) >= 1000 || n % 1 !== 0) {
      return n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    }
    return String(n);
  }

  function renderSummary(stats) {
    summaryEl.innerHTML = '';
    if (!stats.length) {
      summaryEl.textContent = 'Belum ada data.';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'summary-grid';
    stats.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'stat-card';
      var title = document.createElement('h3');
      title.textContent = s.name;
      card.appendChild(title);
      var type = document.createElement('div');
      type.className = 'stat-type';
      type.textContent = s.numeric ? 'Tipe: angka' : 'Tipe: teks';
      card.appendChild(type);
      var list = document.createElement('ul');
      list.className = 'stat-list';
      var items = [];
      items.push(['Terisi', String(s.count)]);
      items.push(['Kosong', String(s.missing)]);
      if (s.numeric) {
        items.push(['Rata-rata', fmtNum(s.mean)]);
        items.push(['Median', fmtNum(s.median)]);
        items.push(['Min', fmtNum(s.min)]);
        items.push(['Maks', fmtNum(s.max)]);
      } else {
        items.push(['Unik', String(s.unique)]);
        items.push(['Terbanyak', s.top && s.top.length ? s.top[0].label + ' (' + s.top[0].count + ')' : '-']);
      }
      items.forEach(function (pair) {
        var li = document.createElement('li');
        var k = document.createElement('span');
        k.className = 'stat-key';
        k.textContent = pair[0];
        var v = document.createElement('span');
        v.className = 'stat-val';
        v.textContent = pair[1];
        li.appendChild(k);
        li.appendChild(v);
        list.appendChild(li);
      });
      card.appendChild(list);
      grid.appendChild(card);
    });
    summaryEl.appendChild(grid);
  }

  function populateSelect(stats) {
    chartSelect.innerHTML = '';
    if (!stats.length) return;
    stats.forEach(function (s, idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = s.name + (s.numeric ? ' (angka)' : ' (teks)');
      chartSelect.appendChild(opt);
    });
    chartSelect.value = '0';
    drawChart(stats, 0);
  }

  function prepareChartData(s) {
    if (s.numeric) {
      var sorted = s.sorted;
      if (!sorted || !sorted.length) return { labels: [], values: [] };
      var binCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(sorted.length))));
      var min = sorted[0];
      var max = sorted[sorted.length - 1];
      if (min === max) {
        return { labels: [fmtNum(min)], values: [sorted.length] };
      }
      var width = (max - min) / binCount;
      var bins = new Array(binCount).fill(0);
      sorted.forEach(function (v) {
        var bi = Math.floor((v - min) / width);
        if (bi >= binCount) bi = binCount - 1;
        if (bi < 0) bi = 0;
        bins[bi]++;
      });
      var labels = [];
      for (var i = 0; i < binCount; i++) {
        var lo = min + i * width;
        var hi = lo + width;
        labels.push(fmtNum(lo) + ' - ' + fmtNum(hi));
      }
      return { labels: labels, values: bins };
    }
    var top = s.top || [];
    return {
      labels: top.map(function (t) { return t.label; }),
      values: top.map(function (t) { return t.count; })
    };
  }

  function drawChart(stats, idx) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);

    if (!stats.length || !stats[idx]) {
      chartInfo.textContent = '';
      return;
    }
    var s = stats[idx];
    var data = prepareChartData(s);
    if (!data.values.length) {
      chartInfo.textContent = 'Tidak ada data untuk digrafikkan.';
      return;
    }
    chartInfo.textContent = s.numeric
      ? 'Distribusi nilai (histogram) untuk kolom "' + s.name + '".'
      : 'Frekuensi nilai teratas untuk kolom "' + s.name + '".';

    var padLeft = 56;
    var padRight = 20;
    var padTop = 24;
    var padBottom = 72;
    var plotW = W - padLeft - padRight;
    var plotH = H - padTop - padBottom;
    var maxVal = Math.max.apply(null, data.values);
    if (maxVal <= 0) maxVal = 1;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var y = padTop + plotH - (plotH * t / ticks);
      var val = maxVal * t / ticks;
      ctx.fillText(fmtNum(Math.round(val)), padLeft - 8, y);
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    var n = data.values.length;
    var gap = 10;
    var barW = Math.max(6, (plotW - gap * (n + 1)) / n);
    for (var i = 0; i < n; i++) {
      var bh = (data.values[i] / maxVal) * plotH;
      var x = padLeft + gap + i * (barW + gap);
      var yTop = padTop + plotH - bh;
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x, yTop, barW, bh);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(data.values[i]), x + barW / 2, yTop - 2);

      ctx.save();
      ctx.translate(x + barW / 2, padTop + plotH + 8);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      var label = data.labels[i];
      if (label.length > 14) label = label.slice(0, 13) + '…';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  function loadText(text, sourceLabel) {
    try {
      var rows = parseCSV(text);
      var norm = normalize(rows);
      if (!norm.headers.length) {
        setStatus('Berkas kosong atau tidak valid.');
        return;
      }
      state.headers = norm.headers;
      state.rows = norm.data;
      var stats = computeStats(norm.headers, norm.data);
      renderSummary(stats);
      populateSelect(stats);
      setStatus('Dimuat: ' + sourceLabel + ' — ' + norm.data.length + ' baris, ' + norm.headers.length + ' kolom.');
    } catch (err) {
      setStatus('Gagal membaca CSV: ' + err.message);
    }
  }

  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      loadText(String(reader.result), f.name);
    };
    reader.onerror = function () {
      setStatus('Gagal membaca berkas.');
    };
    reader.readAsText(f);
  });

  btnSample.addEventListener('click', function () {
    loadText(SAMPLE_CSV, 'contoh bawaan');
  });

  btnClear.addEventListener('click', function () {
    state.headers = [];
    state.rows = [];
    fileInput.value = '';
    summaryEl.textContent = 'Belum ada data.';
    chartSelect.innerHTML = '';
    chartInfo.textContent = '';
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setStatus('Data telah dihapus.');
  });

  chartSelect.addEventListener('change', function () {
    var idx = parseInt(chartSelect.value, 10);
    if (isNaN(idx)) return;
    var stats = computeStats(state.headers, state.rows);
    drawChart(stats, idx);
  });

  window.addEventListener('resize', function () {
    if (!state.headers.length) return;
    var idx = parseInt(chartSelect.value, 10);
    if (isNaN(idx)) idx = 0;
    var stats = computeStats(state.headers, state.rows);
    drawChart(stats, idx);
  });
})();
