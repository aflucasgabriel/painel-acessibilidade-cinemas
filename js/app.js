const geoData = DADOS_GEOJSON[0]; // ajuste conforme a estrutura real
const ufLookup = d3.index(DADOS_UF, d => d.UF_COMPLEXO);

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

inicializarMapa(geoData, ufLookup, tooltip);
inicializarBeeswarm(DADOS_COMPLEXO, tooltip);
inicializarFunil(DADOS_FUNIL, tooltip);