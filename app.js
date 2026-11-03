"use strict";

(function () {
  const uploadBtn = document.getElementById("uploadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const fileInput = document.getElementById("fileInput");
  const statusEl = document.getElementById("status");
  const summarySection = document.getElementById("summarySection");
  const summaryTableContainer = document.getElementById("summaryTableContainer");
  const chartSection = document.getElementById("chartSection");
  const columnSelect = document.getElementById("columnSelect");
  const canvas = document.getElementById("barChart");
  const ctx = canvas.getContext("2d");

  let currentData = null;

  uploadBtn.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    readCSV(file);
  });

  resetBtn.addEventListener("click", function () {
    currentData = null;
    summarySection.hidden = true;
    chartSection.hidden = true;
    summaryTableContainer.innerHTML = "";
    columnSelect.innerHTML = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fileInput.value = "";
    setStatus("");
  });

  columnSelect.addEventListener("change", function () {
    if (currentData) {
      drawChart(columnSelect.value);
    }
  });

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (isError ? " error" : "");
  }

  function readCSV(file) {
    setStatus("Membaca file...", false);
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);
        if (!parsed || parsed.headers.length === 0) {
          throw new Error("File CSV kosong atau tidak valid.");
        }
        currentData = parsed;
        renderSummary(parsed);
        populateColumnSelect(parsed);
        summarySection.hidden = false;
        chartSection.hidden = false;
        setStatus("Berhasil memuat " + parsed.rows.length + " baris dan " + parsed.headers.length + " kolom.", false);
      } catch (err) {
        setStatus("Gagal memproses CSV: " + err.message, true);
        currentData = null;
        summarySection.hidden = true;
        chartSection.hidden = true;
      }
    };
    reader.onerror = function () {
      setStatus("Gagal membaca file.", true);
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const rows = [];
    let headers = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;
      const cells = parseLine(line);
      if (!headers) {
        headers = cells;
      } else {
        rows.push(cells);
      }
    }
    if (!headers) return null;
    // Filter rows with wrong number of columns? We'll pad/truncate to headers length
    const normalizedRows = rows.map(function (row) {
      const r = row.slice(0, headers.length);
      while (r.length < headers.length) r.push("");
      return r;
    });
    return { headers: headers, rows: normalizedRows };
  }

  function parseLine(line) {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          cells.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    cells.push(current);
    return cells;
  }

  function computeStats(values) {
    let count = 0;
    let numericCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    const freq = {};
    for (let i = 0; i < values.length; i++) {
      const v = values[i].trim();
      if (v === "") continue;
      count++;
      const num = Number(v);
      if (!isNaN(num) && v !== "") {
        numericCount++;
        sum += num;
        if (num < min) min = num;
        if (num > max) max = num;
      }
      freq[v] = (freq[v] || 0) + 1;
    }
    const isNumeric = numericCount > 0 && numericCount === count;
    let mean = null;
    if (isNumeric && count > 0) {
      mean = sum / count;
    }
    let topValue = null;
    let topCount = 0;
    for (const key in freq) {
      if (freq[key] > topCount) {
        topCount = freq[key];
        topValue = key;
      }
    }
    return {
      count: count,
      numericCount: numericCount,
      isNumeric: isNumeric,
      sum: isNumeric ? sum : null,
      min: isNumeric ? min : null,
      max: isNumeric ? max : null,
      mean: mean,
      topValue: topValue,
      topCount: topCount,
      freq: freq
    };
  }

  function renderSummary(data) {
    const headers = data.headers;
    const rows = data.rows;
    const statsList = [];
    for (let c = 0; c < headers.length; c++) {
      const values = rows.map(function (row) { return row[c]; });
      const stats = computeStats(values);
      statsList.push({ header: headers[c], stats: stats });
    }

    let html = "<table><thead><tr><th>Kolom</th><th>Tipe</th><th>Jumlah</th><th>Rata-rata</th><th>Min</th><th>Max</th><th>Nilai Terbanyak</th></tr></thead><tbody>";
    for (let i = 0; i < statsList.length; i++) {
      const item = statsList[i];
      const s = item.stats;
      const type = s.isNumeric ? "Numerik" : "Teks";
      const meanStr = s.mean !== null ? formatNumber(s.mean) : "-";
      const minStr = s.min !== null ? formatNumber(s.min) : "-";
      const maxStr = s.max !== null ? formatNumber(s.max) : "-";
      const topStr = s.topValue !== null ? s.topValue + " (" + s.topCount + ")" : "-";
      html += "<tr>";
      html += "<td>" + escapeHtml(item.header) + "</td>";
      html += "<td>" + type + "</td>";
      html += "<td>" + s.count + "</td>";
      html += "<td>" + meanStr + "</td>";
      html += "<td>" + minStr + "</td>";
      html += "<td>" + maxStr + "</td>";
      html += "<td>" + escapeHtml(topStr) + "</td>";
      html += "</tr>";
    }
    html += "</tbody></table>";
    summaryTableContainer.innerHTML = html;
  }

  function formatNumber(n) {
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(2);
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function populateColumnSelect(data) {
    columnSelect.innerHTML = "";
    for (let i = 0; i < data.headers.length; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = data.headers[i];
      columnSelect.appendChild(opt);
    }
    if (data.headers.length > 0) {
      columnSelect.value = "0";
      drawChart(0);
    }
  }

  function drawChart(colIndex) {
    if (!currentData) return;
    const idx = parseInt(colIndex, 10);
    if (isNaN(idx)) return;
    const values = currentData.rows.map(function (row) { return row[idx]; });
    const stats = computeStats(values);

    // We'll draw bar chart of top frequencies for categorical, or histogram for numeric
    let labels = [];
    let counts = [];

    if (stats.isNumeric) {
      // Histogram: create bins
      const nums = [];
      for (let i = 0; i < values.length; i++) {
        const v = values[i].trim();
        if (v === "") continue;
        const num = Number(v);
        if (!isNaN(num)) nums.push(num);
      }
      if (nums.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const min = Math.min.apply(null, nums);
      const max = Math.max.apply(null, nums);
      const binCount = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(nums.length))));
      const range = max - min || 1;
      const binWidth = range / binCount;
      for (let b = 0; b < binCount; b++) {
        const low = min + b * binWidth;
        const high = (b === binCount - 1) ? max : low + binWidth;
        labels.push(formatNumber(low) + " - " + formatNumber(high));
        let count = 0;
        for (let j = 0; j < nums.length; j++) {
          if (nums[j] >= low && (b === binCount - 1 ? nums[j] <= high : nums[j] < high)) count++;
        }
        counts.push(count);
      }
    } else {
      // Categorical: top 10 by frequency
      const freq = stats.freq;
      const entries = Object.keys(freq).map(function (k) { return [k, freq[k]]; });
      entries.sort(function (a, b) { return b[1] - a[1]; });
      const top = entries.slice(0, 10);
      labels = top.map(function (e) { return e[0]; });
      counts = top.map(function (e) { return e[1]; });
    }

    if (labels.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Draw
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 20, bottom: 80, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxCount = Math.max.apply(null, counts) || 1;
    const barWidth = chartWidth / labels.length * 0.8;
    const gap = chartWidth / labels.length * 0.2;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, width, height);

    // Axes
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = (maxCount / yTicks) * i;
      const y = height - padding.bottom - (val / maxCount) * chartHeight;
      ctx.fillText(Math.round(val).toString(), padding.left - 8, y);
      ctx.beginPath();
      ctx.strokeStyle = "#1e293b";
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Bars
    for (let i = 0; i < labels.length; i++) {
      const barHeight = (counts[i] / maxCount) * chartHeight;
      const x = padding.left + i * (barWidth + gap) + gap / 2;
      const y = height - padding.bottom - barHeight;

      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(x, y, barWidth, barHeight);

      // Value on top
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(counts[i].toString(), x + barWidth / 2, y - 2);

      // X-axis label (rotated if needed)
      ctx.save();
      ctx.translate(x + barWidth / 2, height - padding.bottom + 10);
      if (labels[i].length > 8) {
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
      }
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.fillText(labels[i], 0, 0);
      ctx.restore();
    }
  }
})();
