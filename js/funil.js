function inicializarFunil(dadosFunil, tooltip) {
    const container = d3.select("#funil-container");
    const containerWidth = container.node().getBoundingClientRect().width || 600;
    
    const margin = { top: 40, right: 20, bottom: 40, left: 20 };
    const width = containerWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const etapas = dadosFunil.etapas;

    const larguraMaxima = width;
    const widthScale = d3.scaleLinear()
        .domain([0, etapas[0].valor]) 
        .range([0, larguraMaxima]);

    const alturaSegmento = height / (etapas.length - 1);

    function calcularTrapezio(etapaAtual, etapaProxima, indice) {
        const larguraAtual = widthScale(etapaAtual.valor);
        const larguraProxima = widthScale(etapaProxima.valor);
        const yTopo = indice * alturaSegmento;
        const yBase = (indice + 1) * alturaSegmento;
        const centroX = larguraMaxima / 2;
        
        return [
            [centroX - larguraAtual / 2, yTopo],
            [centroX + larguraAtual / 2, yTopo],
            [centroX + larguraProxima / 2, yBase],
            [centroX - larguraProxima / 2, yBase]
        ];
    }

    const corEtapa = d3.scaleSequential(d3.interpolateOranges).domain([-1, etapas.length]);

    svg.selectAll(".segmento-funil")
        .data(etapas.slice(0, -1)) 
        .enter()
        .append("polygon")
        .attr("class", "segmento-funil")
        .attr("points", (d, i) => {
            const pontos = calcularTrapezio(etapas[i], etapas[i+1], i);
            return pontos.map(p => p.join(",")).join(" ");
        })
        .style("fill", (d, i) => corEtapa(i + 1)) 
        .style("stroke", "#000000") 
        .style("stroke-width", "2px")
        .style("opacity", 0.9)
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 1).style("stroke", "#ffffff");
            tooltip.html(`
                <strong>Fase de retenção</strong><br/>
                <hr style="margin: 5px 0; border-color: #555;">
                Sobraram <b>${d.valor}</b> salas
            `).style("opacity", 1);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 0.9).style("stroke", "#000000");
            tooltip.style("opacity", 0);
        });

    const rotulos = svg.selectAll(".label-grupo")
        .data(etapas)
        .enter()
        .append("g")
        .attr("class", "label-grupo")
        .attr("transform", (d, i) => {
            const y = i === etapas.length - 1 ? height : i * alturaSegmento;
            return `translate(${larguraMaxima / 2}, ${y})`;
        });

    rotulos.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", (d, i) => i === etapas.length - 1 ? "1.2em" : "-0.5em")
        .style("fill", "#ffffff")
        .style("font-family", "sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("stroke", "#000000")
        .style("stroke-width", "3px")
        .style("paint-order", "stroke") 
        .text((d, i) => {
            const pctTotal = (100 * d.valor / etapas[0].valor).toFixed(1);
            if (i === 0) return `${d.nome}: ${d.valor} (${pctTotal}%)`;
            const pctAnterior = (100 * d.valor / etapas[i-1].valor).toFixed(1);
            return `${d.nome}: ${d.valor} (${pctTotal}% do total | ${pctAnterior}% da etapa anterior)`;
})
}