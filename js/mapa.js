function inicializarMapa(geoData, ufLookup, tooltip) {
    const container = d3.select("#mapa-container");
    const width = container.node().getBoundingClientRect().width || 800;
    const height = container.node().getBoundingClientRect().height || 600;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator().fitSize([width, height], geoData);

    const path = d3.geoPath().projection(projection);

    const valoresInfras = Array.from(ufLookup.values()).map(d => d.score_infra_medio);
    const extentInfra = d3.extent(valoresInfras);
    
    const colorScale = d3.scaleLinear()
    .domain(extentInfra)
    .range(["#deebf7", "#08519c"]);

    const estados = svg.selectAll(".estado")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "estado")
        .style("fill", d => {
            const dadosUF = ufLookup.get(d.properties.sigla);
            return dadosUF ? colorScale(dadosUF.score_infra_medio) : "#e0e0e0"; 
        });

    estados.on("mouseover", function(event, d) {
        const dadosUF = ufLookup.get(d.properties.sigla);
        let htmlContext = `<strong>Estado: ${d.properties.sigla}</strong><br/>`;

        if(dadosUF) {
            htmlContext += `
                <hr style="margin: 5px 0;">
                Salas: ${dadosUF.qtd_salas}<br/>
                Score Infra: ${(dadosUF.score_infra_medio * 100).toFixed(1)}%<br/>
                Score Capacidade: ${(dadosUF.score_capacidade_medio * 100).toFixed(1)}%
            `;
        } else {
            htmlContext += `<hr style="margin: 5px 0;">Sem dados Ancine`;
        }

        tooltip.html(htmlContext).style("opacity", 1);
    })
    .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 15) + "px");
    })
    .on("mouseout", function() {
        tooltip.style("opacity", 0);
    });

    desenharLegenda(svg, colorScale, extentInfra, width, height);

    const maxSalas = d3.max(Array.from(ufLookup.values()), d => d.qtd_salas);
    
    const glyphSizeScale = d3.scaleSqrt().domain([0, maxSalas]).range([12, 45]);
    
    const extentCap = d3.extent(Array.from(ufLookup.values()), d => d.score_capacidade_medio);
    const capColorScale = d3.scaleSequential(d3.interpolateOranges).domain(extentCap);
    const pathCamera = "M18 11c0-.96-.68-1.76-1.58-1.95c.36-.6.58-1.3.58-2.05c0-2.21-1.79-4-4-4c-1.52 0-2.82.86-3.5 2.1C8.82 3.85 7.52 3 6 3C3.79 3 2 4.79 2 7c0 .9.31 1.73.82 2.4c-.49.36-.82.95-.82 1.6v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-2.5l4 2v-7l-4 2zm-5-6c1.1 0 2 .9 2 2s-.9 2-2 2s-2-.9-2-2s.9-2 2-2M6 5c1.1 0 2 .9 2 2s-.9 2-2 2s-2-.9-2-2s.9-2 2-2";

svg.selectAll(".glyph")
        .data(geoData.features.filter(d => ufLookup.get(d.properties.sigla))) // Filtra UFs vazias
        .enter()
        .append("g")
        .attr("class", "glyph")
        .attr("transform", d => {
            const centroid = path.centroid(d);
            return `translate(${centroid[0]},${centroid[1]})`;
        })
        .style("pointer-events", "none")
        .each(function(d) {
            const data = ufLookup.get(d.properties.sigla);
            const size = glyphSizeScale(data.qtd_salas);
         
            const scaleFactor = size / 24;

            d3.select(this).append("path")
                .attr("d", pathCamera)
                .attr("transform", `translate(${-size/2}, ${-size/2}) scale(${scaleFactor})`)
                .style("fill", capColorScale(data.score_capacidade_medio))
                .style("stroke", "#ffffff") 
                .style("stroke-width", "1.5px")
                .style("vector-effect", "non-scaling-stroke"); 
        });
}

function desenharLegenda(svg, scale, extent, width, height) {
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legenda-infra")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    const numStops = 10;
    for(let i=0; i<=numStops; i++) {
        let t = i / numStops;
        let value = extent[0] + t * (extent[1] - extent[0]);
        linearGradient.append("stop")
            .attr("offset", (t * 100) + "%")
            .attr("stop-color", scale(value));
    }

    const legendW = 200;
    const legendH = 10;
    const legendG = svg.append("g")
        .attr("transform", `translate(30, ${height - 60})`);

    legendG.append("text")
        .attr("class", "legend-text")
        .attr("x", 0)
        .attr("y", -8)
        .text("Infraestrutura Média");

    legendG.append("rect")
        .attr("width", legendW)
        .attr("height", legendH)
        .style("fill", "url(#legenda-infra)")
        .style("stroke", "#ccc");

    const axisScale = d3.scaleLinear().domain(extent).range([0, legendW]);
    const axisBottom = d3.axisBottom(axisScale).ticks(4).tickFormat(d3.format(".0%"));
    
    legendG.append("g")
        .attr("transform", `translate(0, ${legendH})`)
        .call(axisBottom)
        .select(".domain").remove(); 
}