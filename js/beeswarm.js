// js/beeswarm.js

function inicializarBeeswarm(dados, tooltip) { 
    const container = d3.select("#beeswarm-container");
    const width = container.node().getBoundingClientRect().width || 1000;
    const height = 400; 
    const margin = { top: 20, right: 40, bottom: 50, left: 40 };

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(dados, d => d.total_assentos))
        .range([margin.left, width - margin.right]);

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, 1]);

    const pathPoltrona = "M5.039 19.346q-.214 0-.357-.143q-.144-.143-.144-.357v-1H4q-.846 0-1.423-.577T2 15.846v-5q0-.632.434-1.066q.433-.434 1.066-.434t1.066.434Q5 10.214 5 10.846v3.5h14v-3.5q0-.632.434-1.066q.433-.434 1.066-.434t1.066.434q.434.434.434 1.066v5q0 .846-.577 1.423T20 17.846h-.538v1q0 .194-.134.347t-.328.153q-.213 0-.357-.143q-.143-.144-.143-.357v-1H5.539v1q0 .214-.144.357q-.143.143-.357.143m.962-6v-2.5q0-.932-.559-1.664Q4.883 8.45 4 8.346V7.231q0-.846.577-1.423T6 5.23h12q.846 0 1.423.577T20 7.23v1.115q-.889.1-1.444.828Q18 9.902 18 10.846v2.5z";

    const tamanhoIcone = 12; 
    const scaleFactor = tamanhoIcone / 24; 
    const raioColisao = tamanhoIcone / 2; 

    const xAxis = d3.axisBottom(xScale).ticks(10);
    const gX = svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    gX.selectAll("text").style("fill", "#ffffff").style("font-family", "sans-serif");
    gX.selectAll("line, .domain").style("stroke", "#555555");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .style("fill", "#aaaaaa")
        .style("font-family", "sans-serif")
        .style("font-size", "12px")
        .text("Total de Assentos no Complexo (Capacidade)");

    const node = svg.append("g")
        .selectAll("g.poltrona-node")
        .data(dados)
        .enter()
        .append("g")
        .attr("class", "poltrona-node")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).select("path")
                .style("stroke", "#ffffff")
                .style("stroke-width", "1.5px");

            const nomeComplexo = d.ID_COMPLEXO || `${d.NOME_COMPLEXO} (${d.UF_COMPLEXO})`;

            tooltip.html(`
                <strong>${nomeComplexo}</strong><br/>
                <hr style="margin: 5px 0; border-color: #555;">
                Total de Assentos: ${d.total_assentos}<br/>
                Total de Salas: ${d.qtd_salas}<br/>
                Score Infraestrutura: ${(d.score_infra_medio * 100).toFixed(1)}%
            `).style("opacity", 1);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).select("path")
                .style("stroke", "#000000")
                .style("stroke-width", "0.5px");
            tooltip.style("opacity", 0);
        });

    node.append("path")
        .attr("d", pathPoltrona)
        .style("fill", d => colorScale(d.score_infra_medio))
        .style("stroke", "#000000") 
        .style("stroke-width", "0.5px")
        .style("vector-effect", "non-scaling-stroke")
        .attr("transform", `scale(${scaleFactor}) translate(-12, -12)`);

    const simulation = d3.forceSimulation(dados)
        .force("x", d3.forceX(d => xScale(d.total_assentos)).strength(1))
        .force("y", d3.forceY((height - margin.bottom) / 2).strength(0.08))
        .force("collide", d3.forceCollide(raioColisao + 1).iterations(2));

    simulation.on("tick", () => {
        node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
}