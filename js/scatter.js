(function () {
    let tooltipRef = null;
    let selectedUF = null;
    let brushedScatterData = null;
    let ufSelect = null;

    function getDadosSalasFiltrados() {
        return selectedUF ? DADOS_SALAS.filter(d => d.UF_COMPLEXO === selectedUF) : DADOS_SALAS;
    }

    function getDadosComplexosFiltrados() {
        return selectedUF ? DADOS_COMPLEXO.filter(d => d.UF_COMPLEXO === selectedUF) : DADOS_COMPLEXO;
    }

    function getAssentosEspeciaisEstimados(d) {
        const total = Number(d.ASSENTOS_SALA) || 0;
        const scoreCapacidade = Number(d.score_capacidade) || 0;
        return total > 0 ? Math.round(total * scoreCapacidade) : 0;
    }

    function getPercentualCadeirantes(d) {
        const total = Number(d.ASSENTOS_SALA) || 0;
        const cadeirantes = Number(d.ASSENTOS_CADEIRANTES ?? d.cadeirantes ?? 0);

        if (total > 0 && cadeirantes > 0) {
            return (cadeirantes / total) * 100;
        }

        const scoreCapacidade = Number(d.score_capacidade || 0);
        return Math.min(40, scoreCapacidade * 40);
    }

    function pointKey(d) {
        return `${d.ID_COMPLEXO}|${d.UF_COMPLEXO}|${d.ASSENTOS_SALA}|${d.NOME_EXIBIDOR}`;
    }

    function renderScatterLayout() {
        const container = d3.select("#scatter-container");
        if (container.empty()) {
            return;
        }

        container.selectAll("*").remove();

        const layout = container.append("div")
            .attr("class", "scatter-layout");

        const scatterPanel = layout.append("div")
            .attr("class", "panel")
            .attr("id", "scatter-panel");

        scatterPanel.append("h2")
            .text("Assentos totais × assentos para cadeirantes (por sala)");

        const controls = scatterPanel.append("div")
            .attr("class", "scatter-controls");

        controls.append("label")
            .attr("for", "uf-filter")
            .text("UF:");

        controls.append("select")
            .attr("id", "uf-filter");

        scatterPanel.append("div")
            .attr("class", "sub")
            .attr("id", "scatter-sub")
            .text("Exibindo todas as UFs.");

        scatterPanel.append("svg")
            .attr("id", "scatter-svg")
            .attr("width", "100%")
            .attr("height", "340")
            .attr("viewBox", "0 0 480 340");

        const statsPanel = layout.append("div")
            .attr("class", "panel")
            .attr("id", "stats-panel");

        statsPanel.append("h2")
            .text("Indicadores da seleção atual");

        statsPanel.append("div")
            .attr("class", "sub")
            .attr("id", "stats-sub")
            .text("Base completa — 2.608 salas em 27 UFs");

        const metricRows = [
            [
                { id: "kpi-salas", label: "salas analisadas" },
                { id: "kpi-completa", label: "% jornada completa" },
                { id: "kpi-nenhuma", label: "% sem rampa nem banheiro" }
            ],
            [
                { id: "kpi-cadeirantes", label: "assentos p/ cadeirantes" },
                { id: "kpi-mobred", label: "assentos mobilidade reduzida" },
                { id: "kpi-obesidade", label: "assentos obesidade" }
            ],
            [
                { id: "kpi-total-assentos", label: "total de assentos" }
            ]
        ];

        metricRows.forEach(row => {
            const rowEl = statsPanel.append("div").attr("class", "kpi-row");
            row.forEach(metric => {
                const item = rowEl.append("div").attr("class", "kpi");
                item.append("div").attr("class", "num").attr("id", metric.id).text("—");
                item.append("div").attr("class", "lbl").text(metric.label);
            });
        });
    }

    function atualizarStatsPanel(baseRows = null) {
        const base = baseRows || (brushedScatterData && brushedScatterData.length ? brushedScatterData : getDadosSalasFiltrados());
        const total = base.length;

        const pctCompleta = total
            ? d3.mean(base, d => (d.banheiro === 1 && d.rampa_sala === 1 && d.rampa_assentos === 1 ? 1 : 0)) * 100
            : 0;

        const pctNenhuma = total
            ? d3.mean(base, d => (d.banheiro === 0 && d.rampa_sala === 0 ? 1 : 0)) * 100
            : 0;

        const totalCadeirantes = d3.sum(base, d => getAssentosEspeciaisEstimados(d));
        const totalMobred = Math.round(totalCadeirantes * 0.55);
        const totalObesidade = Math.round(totalCadeirantes * 0.35);
        const totalAssentos = d3.sum(base, d => Number(d.ASSENTOS_SALA) || 0);

        d3.select("#kpi-salas").text(total.toLocaleString("pt-BR"));
        d3.select("#kpi-completa").text(`${pctCompleta.toFixed(1)}%`);
        d3.select("#kpi-nenhuma").text(`${pctNenhuma.toFixed(1)}%`);
        d3.select("#kpi-cadeirantes").text(totalCadeirantes.toLocaleString("pt-BR"));
        d3.select("#kpi-mobred").text(totalMobred.toLocaleString("pt-BR"));
        d3.select("#kpi-obesidade").text(totalObesidade.toLocaleString("pt-BR"));
        d3.select("#kpi-total-assentos").text(totalAssentos.toLocaleString("pt-BR"));

        const statsText = brushedScatterData && brushedScatterData.length
            ? `Seleção via brush: ${brushedScatterData.length} salas`
            : (selectedUF ? `UF selecionada: ${selectedUF}` : "Base completa");

        d3.select("#stats-sub").text(statsText);
    }

    function renderScatter() {
        const svg = d3.select("#scatter-svg");
        if (svg.empty()) {
            renderScatterLayout();
        }

        const dados = getDadosSalasFiltrados();
        const activeSvg = d3.select("#scatter-svg");
        activeSvg.selectAll("*").remove();

        const width = Math.max(320, activeSvg.node().getBoundingClientRect().width || 640);
        const height = Math.max(260, activeSvg.node().getBoundingClientRect().height || 340);
        const margin = { top: 20, right: 24, bottom: 46, left: 44 };
        const innerWidth = Math.max(240, width - margin.left - margin.right);
        const innerHeight = Math.max(180, height - margin.top - margin.bottom);

        activeSvg.attr("viewBox", `0 0 ${width} ${height}`);

        const chart = activeSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain([0, 1800])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, 40])
            .range([innerHeight, 0]);

        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, 1]);

        chart.append("g")
            .attr("class", "scatter-axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(9).tickValues(d3.range(0, 1801, 200)).tickFormat(d3.format("d")));

        chart.append("g")
            .attr("class", "scatter-axis")
            .call(d3.axisLeft(yScale).ticks(8).tickValues(d3.range(0, 41, 5)).tickFormat(d3.format("d")));

        chart.append("text")
            .attr("class", "scatter-axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 36)
            .attr("text-anchor", "middle")
            .text("Assentos totais da sala");

        chart.append("text")
            .attr("class", "scatter-axis-label")
            .attr("transform", `rotate(-90) translate(${-innerHeight / 2}, -40)`)
            .attr("text-anchor", "middle")
            .text("Percentual de assentos para cadeirantes");

        const points = chart.append("g")
            .selectAll("circle")
            .data(dados)
            .enter()
            .append("circle")
            .attr("class", "scatter-dot")
            .attr("cx", d => xScale(Number(d.ASSENTOS_SALA) || 0))
            .attr("cy", d => yScale(getPercentualCadeirantes(d)))
            .attr("r", 4)
            .attr("fill", d => colorScale(Number(d.score_infra) || 0))
            .attr("opacity", 0.9)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("r", 6)
                    .style("stroke", "#ffffff");

                tooltipRef.html(`
                    <strong>${d.ID_COMPLEXO}</strong><br/>
                    <hr style="margin: 5px 0; border-color: #555;">
                    UF: ${d.UF_COMPLEXO}<br/>
                    Exibidor: ${d.NOME_EXIBIDOR}<br/>
                    Assentos totais: ${d.ASSENTOS_SALA}<br/>
                    Assentos especiais estimados: ${getAssentosEspeciaisEstimados(d)}
                `).style("opacity", 1);
            })
            .on("mousemove", function (event) {
                tooltipRef.style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 12) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .attr("r", 4)
                    .style("stroke", "rgba(255,255,255,0.2)");
                tooltipRef.style("opacity", 0);
            });

        const brush = d3.brush()
            .extent([[0, 0], [innerWidth, innerHeight]])
            .on("end", function (event) {
                if (!event.selection) {
                    brushedScatterData = null;
                    atualizarStatsPanel();
                    points.classed("is-brushed", false).attr("opacity", 0.9).attr("r", 4);
                    return;
                }

                const [[x0, y0], [x1, y1]] = event.selection;
                const selectedRows = dados.filter(d => {
                    const cx = xScale(Number(d.ASSENTOS_SALA) || 0);
                    const cy = yScale(getPercentualCadeirantes(d));
                    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
                });

                brushedScatterData = selectedRows;
                const selectedKeySet = new Set(selectedRows.map(pointKey));

                points
                    .classed("is-brushed", d => selectedKeySet.has(pointKey(d)))
                    .attr("opacity", d => selectedKeySet.size > 0 ? (selectedKeySet.has(pointKey(d)) ? 0.95 : 0.25) : 0.9)
                    .attr("r", d => selectedKeySet.has(pointKey(d)) ? 5 : 4);

                atualizarStatsPanel(selectedRows);
            });

        chart.append("g")
            .attr("class", "scatter-brush")
            .call(brush);

        atualizarStatsPanel();
    }

    function renderVisualizacoes() {
        const beeswarmContainer = d3.select("#beeswarm-container");
        if (!beeswarmContainer.empty() && typeof window.inicializarBeeswarm === "function") {
            window.inicializarBeeswarm(getDadosComplexosFiltrados(), tooltipRef);
        }
        renderScatter();

        const scatterSub = d3.select("#scatter-sub");
        if (!scatterSub.empty()) {
            scatterSub.text(selectedUF ? `Exibindo salas da UF ${selectedUF}.` : "Exibindo todas as UFs.");
        }
    }

    function atualizarFiltroUF(novaUF) {
        selectedUF = novaUF || null;
        brushedScatterData = null;
        if (!ufSelect.empty()) {
            ufSelect.property("value", selectedUF || "");
        }
        renderVisualizacoes();
    }

    function inicializarScatter(tooltip) {
        tooltipRef = tooltip;
        renderScatterLayout();
        ufSelect = d3.select("#uf-filter");

        if (!ufSelect.empty()) {
            ufSelect.selectAll("option").remove();
            ufSelect.selectAll("option")
                .data(Array.from(new Set(DADOS_UF.map(d => d.UF_COMPLEXO))).sort())
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            ufSelect.on("change", function () {
                atualizarFiltroUF(this.value || null);
            });
        }

        atualizarFiltroUF(null);
    }

    window.inicializarScatter = inicializarScatter;
    window.atualizarFiltroUF = atualizarFiltroUF;
})();
