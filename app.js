(function () {
  'use strict';

  var fileInput = document.getElementById('fileInput');
  var btnSample = document.getElementById('btnSample');
  var btnClear = document.getElementById('btnClear');
  var statusEl = document.getElementById('status');
  var summarySection = document.getElementById('summarySection');
  var summaryBody = document.querySelector('#summaryTable tbody');
  var chartSection = document.getElementById('chartSection');
  var columnSelect = document.getElementById('columnSelect');
  var canvas = document.getElementById('chartCanvas');
  var chartNote = document.getElementById('chartNote');
  var ctx = canvas.getContext('2d');

  var currentHeaders = [];
  var currentRows = [];

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
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
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0].trim() === '') {
      rows.pop();
    }
    return rows;
  }

  function isNumeric(value) {
    if (value === null || value === undefined) return false;
    var v = String(value).trim();
    if (v === '') return false;
    return /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v);
  }

  function fmtNum(n) {
    if (!isFinite(n)) return '-';
    if (Math.abs(n) >= 1000) return n.toFixed(2);
    return String(Math.round(n * 100) / 100);
  }

  function analyze() {
    if (currentHeaders.length === 0) {
      summarySection.hidden = true;
      chartSection.hidden = true;
      return;
    }
    summaryBody.innerHTML = '';
    var colStats = currentHeaders.map(function (h) {
      return { name: h, values: [], numericCount: 0, empty: 0 };
    });
    currentRows.forEach(function (r) {
      for (var c = 0; c < currentHeaders.length; c++) {
        var raw = r[c] === undefined ? '' : r[c];
        var st = colStats[c];
        if (raw.trim() === '') {
          st.empty++;
        } else {
          st.values.push(raw);
          if (isNumeric(raw)) st.numericCount++;
        }
      }
    });

    columnSelect.innerHTML = '';
    colStats.forEach(function (st, idx) {
      var type = 'teks';
      var minVal = '-', maxVal = '-', avgVal = '-';
      if (st.values.length > 0 && st.numericCount === st.values.length) {
        type = 'angka';
        var nums = st.values.map(Number);
        var min = Math.min.apply(null, nums);
        var max = Math.max.apply(null, nums);
        var sum = nums.reduce(function (a, b) { return a + b; }, 0);
        minVal = fmtNum(min);
        maxVal = fmtNum(max);
        avgVal = fmtNum(sum / nums.length);
      }
      var uniq = {};
      st.values.forEach(function (v) { uniq[v] = true; });
      var uniqueCount = Object.keys(uniq).length;

      var tr = document.createElement('tr');
      var cells = [st.name, type, String(st.values.length), String(uniqueCount), String(st.empty), minVal, maxVal, avgVal];
      cells.forEach(function (c) {
        var td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      summaryBody.appendChild(tr);

      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = st.name;
      columnSelect.appendChild(opt);
    });

    summarySection.hidden = false;
    chartSection.hidden = false;
    if (columnSelect.options.length > 0) {
      columnSelect.selectedIndex = 0;
      drawChart(0);
    } else {
      clearCanvas();
      chartNote.textContent = 'Tidak ada kolom untuk digrafikkan.';
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawChart(colIndex) {
    clearCanvas();
    chartNote.textContent = '';
    var name = currentHeaders[colIndex];
    var counts = {};
    var numeric = [];
    var useNumeric = true;
    var seen = 0;
    currentRows.forEach(function (r) {
      var raw = r[colIndex] === undefined ? '' : r[colIndex];
      if (raw.trim() === '') return;
      seen++;
      if (isNumeric(raw)) {
        numeric.push(Number(raw));
      } else {
        useNumeric = false;
      }
      counts[raw] = (counts[raw] || 0) + 1;
    });

    var bars = [];
    if (seen === 0) {
      chartNote.textContent = 'Kolom "' + name + '" tidak memiliki data untuk digrafikkan.';
      return;
    }

    if (useNumeric && numeric.length === seen) {
      var min = Math.min.apply(null, numeric);
      var max = Math.max.apply(null, numeric);
      var bins = 8;
      var range = max - min;
      var binWidth = range === 0 ? 1 : range / bins;
      var binCounts = new Array(bins).fill(0);
      numeric.forEach(function (v) {
        var b = range === 0 ? 0 : Math.min(bins - 1, Math.floor((v - min) / binWidth));
        binCounts[b]++;
      });
      binCounts.forEach(function (cnt, i) {
        var lo = min + i * binWidth;
        var hi = lo + binWidth;
        bars.push({ label: fmtNum(lo) + '–' + fmtNum(hi), value: cnt });
      });
      chartNote.textContent = 'Distribusi numerik kolom "' + name + '" (' + seen + ' nilai).';
    } else {
      var entries = Object.keys(counts).map(function (k) { return { label: k, value: counts[k] }; });
      entries.sort(function (a, b) { return b.value - a.value; });
      bars = entries.slice(0, 12);
      chartNote.textContent = 'Frekuensi nilai kategori kolom "' + name + '" (menampilkan maks 12 kategori teratas dari ' + entries.length + ').';
    }

    renderBars(bars);
  }

  function renderBars(bars) {
    var W = canvas.width;
    var H = canvas.height;
    var pad = 50;
    var chartW = W - pad * 2;
    var chartH = H - pad * 2;
    var n = bars.length;

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);

    var maxVal = 0;
    bars.forEach(function (b) { if (b.value > maxVal) maxVal = b.value; });
    if (maxVal === 0) maxVal = 1;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, pad + chartH);
    ctx.lineTo(pad + chartW, pad + chartH);
    ctx.stroke();

    var slot = chartW / n;
    var barW = Math.min(60, slot * 0.65);

    bars.forEach(function (b, i) {
      var x = pad + i * slot + (slot - barW) / 2;
      var h = (b.value / maxVal) * chartH;
      var y = pad + chartH - h;
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(b.value), x + barW / 2, y - 6);
      var label = b.label;
      if (label.length > 12) label = label.slice(0, 11) + '…';
      ctx.fillStyle = '#94a3b8';
      ctx.save();
      ctx.translate(x + barW / 2, pad + chartH + 16);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = 'right';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  }

  function loadCSVText(text) {
    var rows = parseCSV(text);
    if (rows.length === 0) {
      setStatus('File CSV kosong atau tidak valid.');
      return;
    }
    currentHeaders = rows[0].map(function (h, i) { return h.trim() === '' ? 'Kolom ' + (i + 1) : h.trim(); });
    currentRows = rows.slice(1);
    if (currentRows.length === 0) {
      setStatus('CSV hanya berisi header, tidak ada data.');
      summarySection.hidden = true;
      chartSection.hidden = true;
      return;
    }
    setStatus('Dimuat: ' + currentHeaders.length + ' kolom, ' + currentRows.length + ' baris data.');
    analyze();
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      loadCSVText(String(e.target.result));
    };
    reader.onerror = function () {
      setStatus('Gagal membaca file.');
    };
    reader.readAsText(file);
  }

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length > 0) {
      readFile(fileInput.files[0]);
    }
  });

  btnSample.addEventListener('click', function () {
    var sample = 'nama,usia,kota,skor\nAni,23,Bandung,88\nBudi,31,Jakarta,75\nCitra,27,Bandung,92\nDewi,35,Surabaya,65\nEko,42,Jakarta,80\nFajar,29,Bandung,70\nGita,24,Surabaya,95\nHani,38,Jakarta,85\n';
    loadCSVText(sample);
  });

  btnClear.addEventListener('click', function () {
    currentHeaders = [];
    currentRows = [];
    fileInput.value = '';
    summaryBody.innerHTML = '';
    columnSelect.innerHTML = '';
    summarySection.hidden = true;
    chartSection.hidden = true;
    chartNote.textContent = '';
    clearCanvas();
    setStatus('Data dihapus. Belum ada file dimuat.');
  });

  columnSelect.addEventListener('change', function () {
    var idx = parseInt(columnSelect.value, 10);
    if (!isNaN(idx)) drawChart(idx);
  });

  clearCanvas();
})();
