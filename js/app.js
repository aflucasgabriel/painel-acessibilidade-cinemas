const geoData = DADOS_GEOJSON[0];
const ufLookup = d3.index(DADOS_UF, d => d.UF_COMPLEXO);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

function inicializarAplicacao() {
    inicializarMapa(geoData, ufLookup, tooltip, window.atualizarFiltroUF || null);
    inicializarFunil(DADOS_FUNIL, tooltip);
    if (typeof window.inicializarScatter === "function") {
        window.inicializarScatter(tooltip);
    }
}

inicializarAplicacao();